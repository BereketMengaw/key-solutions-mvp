-- Key Solutions demo: stock hardening (slice 4 review).
--
--   1. place_order is the only way to create orders. The column INSERT grants and the
--      insert policies on orders / order_items (from the security-invoker days) let a
--      waiter insert an order and its lines directly and skip the stock deduction.
--      They are gone; place_order (security definer) still writes both tables, and the
--      orders/order_items triggers (status, timestamps, unit price) still fire.
--   2. place_order takes a per-ref advisory lock before looking up p_client_ref, so a
--      retry overlapping a still-running first call waits for it and gets its order
--      back, instead of failing "Not enough ..." on the stock the first call took.
--   3. add_stock gets an optional p_client_ref (idempotency key, stored on the movement).
--      A repeat with the same ref adds nothing and returns the current quantity.

-- ---------------------------------------------------------------- 1. no direct inserts

drop policy "waiter creates own orders" on public.orders;
drop policy "waiter adds items to own new order" on public.order_items;

revoke insert on public.orders from authenticated, anon, public;
revoke insert (table_id, waiter_id, client_ref) on public.orders from authenticated;
revoke insert on public.order_items from authenticated, anon, public;
revoke insert (order_id, menu_item_id, quantity, note) on public.order_items from authenticated;

-- ---------------------------------------------------------------- 2. place_order v4

create or replace function public.place_order(p_table_id bigint, p_items jsonb, p_client_ref uuid default null)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order_id bigint;
  v_owner uuid;
  v_item jsonb;
  v_menu_item_id numeric;
  v_quantity numeric;
  v_available boolean;
  v_ingredient_ids bigint[];
  v_needs numeric[];
  v_short record;
  v_short_for text;
begin
  if public.auth_role() is distinct from 'waiter' then
    raise exception 'Only a waiter can place orders' using errcode = '42501';
  end if;

  -- A retry of an order that already went through: hand back the same id, deduct nothing.
  -- The advisory lock (held until commit) makes a retry that overlaps a still-running
  -- first call wait for it, then find its order here, instead of queueing on the
  -- ingredient locks and failing "Not enough ..." against the stock the first call took.
  if p_client_ref is not null then
    perform pg_advisory_xact_lock(hashtext('place_order'), hashtext(p_client_ref::text));
    select id, waiter_id into v_order_id, v_owner
    from public.orders where client_ref = p_client_ref;
    if found then
      if v_owner is distinct from auth.uid() then
        raise exception 'This order reference is already used' using errcode = '22023';
      end if;
      return v_order_id;
    end if;
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'An order needs at least one item' using errcode = '22023';
  end if;

  if not exists (select 1 from public.dining_tables where id = p_table_id) then
    raise exception 'Table % does not exist', p_table_id using errcode = '22023';
  end if;

  -- Check every line before writing anything, so errors are clear.
  for v_item in select value from jsonb_array_elements(p_items) loop
    if jsonb_typeof(v_item) <> 'object'
       or jsonb_typeof(v_item -> 'menu_item_id') is distinct from 'number'
       or jsonb_typeof(v_item -> 'quantity') is distinct from 'number' then
      raise exception 'Each item needs a numeric menu_item_id and quantity' using errcode = '22023';
    end if;

    if jsonb_typeof(v_item -> 'note') not in ('string', 'null') then
      raise exception 'An item note must be text' using errcode = '22023';
    end if;
    if char_length(v_item ->> 'note') > 200 then
      raise exception 'An item note can be at most 200 characters' using errcode = '22023';
    end if;

    v_quantity := (v_item ->> 'quantity')::numeric;
    if v_quantity <> trunc(v_quantity) or v_quantity < 1 or v_quantity > 99 then
      raise exception 'Quantity must be a whole number from 1 to 99' using errcode = '22023';
    end if;

    v_menu_item_id := (v_item ->> 'menu_item_id')::numeric;
    v_available := null;
    if v_menu_item_id = trunc(v_menu_item_id) and v_menu_item_id between 1 and 9223372036854775807 then
      select is_available into v_available
      from public.menu_items where id = v_menu_item_id::bigint;
    end if;

    if v_available is null then
      raise exception 'Menu item % does not exist', v_item ->> 'menu_item_id' using errcode = '22023';
    elsif not v_available then
      raise exception 'Menu item % is not available', v_item ->> 'menu_item_id' using errcode = '22023';
    end if;
  end loop;

  -- Total use per ingredient across all lines (lines are valid now, so the casts are safe).
  select array_agg(n.ingredient_id order by n.ingredient_id),
         array_agg(n.need order by n.ingredient_id)
  into v_ingredient_ids, v_needs
  from (
    select r.ingredient_id, sum((e.value ->> 'quantity')::numeric * r.quantity_per_item) as need
    from jsonb_array_elements(p_items) as e(value)
    join public.recipe_items r on r.menu_item_id = (e.value ->> 'menu_item_id')::numeric::bigint
    group by r.ingredient_id
  ) n;

  if v_ingredient_ids is not null then
    -- Lock the rows, always in id order so two orders can't deadlock. A second order
    -- needing the same ingredient waits here and then sees the first one's deduction.
    perform 1 from public.ingredients
    where id = any (v_ingredient_ids)
    order by id
    for update;

    select i.id, i.name, i.unit, i.quantity_on_hand into v_short
    from unnest(v_ingredient_ids, v_needs) as n(ingredient_id, need)
    join public.ingredients i on i.id = n.ingredient_id
    where i.quantity_on_hand < n.need
    order by i.name
    limit 1;

    if found then
      -- Name the menu items on this order that use the missing ingredient.
      select string_agg(format('%s × %s', s.qty, s.name), ', ' order by s.first_line)
      into v_short_for
      from (
        select m.name, trim_scale(sum((e.value ->> 'quantity')::numeric)) as qty, min(e.ord) as first_line
        from jsonb_array_elements(p_items) with ordinality as e(value, ord)
        join public.menu_items m on m.id = (e.value ->> 'menu_item_id')::numeric::bigint
        join public.recipe_items r on r.menu_item_id = m.id and r.ingredient_id = v_short.id
        group by m.id, m.name
      ) s;

      raise exception 'Not enough % for % (% % left)',
        v_short.name, v_short_for, trim_scale(v_short.quantity_on_hand), v_short.unit
        using errcode = '22023';
    end if;
  end if;

  begin
    insert into public.orders (table_id, client_ref)
    values (p_table_id, p_client_ref)
    returning id into v_order_id;
  exception when unique_violation then
    -- Two calls with the same ref raced; the other one won and already deducted stock.
    select id, waiter_id into v_order_id, v_owner
    from public.orders where client_ref = p_client_ref;
    if v_owner is distinct from auth.uid() then
      raise exception 'This order reference is already used' using errcode = '22023';
    end if;
    return v_order_id;
  end;

  -- Cast through numeric so 2.0 becomes 2 (already checked to be whole above).
  insert into public.order_items (order_id, menu_item_id, quantity, note)
  select
    v_order_id,
    (e.value ->> 'menu_item_id')::numeric::bigint,
    (e.value ->> 'quantity')::numeric::integer,
    coalesce(btrim(e.value ->> 'note'), '')
  from jsonb_array_elements(p_items) with ordinality as e(value, ord)
  order by e.ord;

  -- One 'order' movement per ingredient; the trigger lowers quantity_on_hand.
  -- created_by defaults to auth.uid() (the waiter).
  if v_ingredient_ids is not null then
    insert into public.stock_movements (ingredient_id, change, reason, order_id)
    select n.ingredient_id, -n.need, 'order', v_order_id
    from unnest(v_ingredient_ids, v_needs) as n(ingredient_id, need)
    order by n.ingredient_id;
  end if;

  return v_order_id;
end;
$$;

revoke execute on function public.place_order(bigint, jsonb, uuid) from public, anon;
grant execute on function public.place_order(bigint, jsonb, uuid) to authenticated;

-- ---------------------------------------------------------------- 3. add_stock with client_ref

alter table public.stock_movements add column client_ref uuid;
-- Unique when set (nulls never clash). A ref belongs to whoever used it first.
alter table public.stock_movements add constraint stock_movements_client_ref_key unique (client_ref);

drop function public.add_stock(bigint, numeric, text);

create function public.add_stock(
  p_ingredient_id bigint,
  p_quantity numeric,
  p_note text default null,
  p_client_ref uuid default null
)
returns numeric
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_note text := coalesce(btrim(p_note), '');
  v_new numeric;
  v_prev record;
begin
  if public.auth_role() is null or public.auth_role() not in ('manager', 'owner') then
    raise exception 'Only a manager or owner can add stock' using errcode = '42501';
  end if;

  -- A repeat of a delivery that already went through: add nothing, return the level now.
  -- The advisory lock makes an overlapping repeat wait for the first call to commit.
  if p_client_ref is not null then
    perform pg_advisory_xact_lock(hashtext('add_stock'), hashtext(p_client_ref::text));

    select ingredient_id, created_by into v_prev
    from public.stock_movements where client_ref = p_client_ref;
    if found then
      if v_prev.created_by is distinct from auth.uid()
         or v_prev.ingredient_id is distinct from p_ingredient_id then
        raise exception 'This stock reference is already used' using errcode = '22023';
      end if;
      select quantity_on_hand into v_new from public.ingredients where id = p_ingredient_id;
      return v_new;
    end if;
  end if;

  -- NaN and Infinity also fail these (NaN sorts above every number).
  if p_quantity is null or p_quantity <= 0 then
    raise exception 'Amount must be more than 0' using errcode = '22023';
  end if;
  if p_quantity > 10000 then
    raise exception 'Amount can be at most 10000 at a time' using errcode = '22023';
  end if;
  if p_quantity <> round(p_quantity, 3) then
    raise exception 'Amount can have at most 3 decimals' using errcode = '22023';
  end if;
  if char_length(v_note) > 200 then
    raise exception 'A note can be at most 200 characters' using errcode = '22023';
  end if;

  perform 1 from public.ingredients where id = p_ingredient_id for update;
  if not found then
    raise exception 'Ingredient % does not exist', p_ingredient_id using errcode = '22023';
  end if;

  -- created_by defaults to auth.uid(); the trigger raises quantity_on_hand.
  insert into public.stock_movements (ingredient_id, change, reason, note, client_ref)
  values (p_ingredient_id, p_quantity, 'restock', v_note, p_client_ref);

  select quantity_on_hand into v_new from public.ingredients where id = p_ingredient_id;
  return v_new;
end;
$$;

revoke execute on function public.add_stock(bigint, numeric, text, uuid) from public, anon;
grant execute on function public.add_stock(bigint, numeric, text, uuid) to authenticated;
