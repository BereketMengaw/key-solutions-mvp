-- Key Solutions demo: stock (slice 4).
--
--   1. place_order deducts ingredients in the same transaction as the order.
--      Not enough of anything -> 22023 "Not enough Beef for 30 × Beef Tibs (4.8 kg left)",
--      and nothing is written.
--   2. add_stock(p_ingredient_id, p_quantity, p_note) -> new quantity_on_hand.
--      Manager/owner only; writes a 'restock' movement.
--   3. Realtime on ingredients and stock_movements (RLS: manager/owner only).
--
-- Why place_order is now SECURITY DEFINER:
--   The waiter must not read ingredients or write stock_movements (RLS and grants say so),
--   yet sending an order has to read stock and write 'order' movements. Running the
--   function as its owner lets it do exactly that and nothing else. In exchange it no
--   longer leans on RLS, so every rule RLS used to enforce is checked explicitly here:
--   caller must be a waiter, waiter_id is always auth.uid() (column default), the order
--   starts as 'sent' (trigger), only the listed columns are written, and a client_ref
--   belonging to another waiter is refused. search_path = '' and fully qualified names
--   keep it safe from search_path tricks.

-- ---------------------------------------------------------------- schema

-- Optional delivery note on a restock ("Delivery from Shola butcher").
alter table public.stock_movements
  add column note text not null default ''
  check (char_length(note) <= 200);

-- Backstop: even if a check is ever missed, stock can never go below zero.
alter table public.ingredients
  add constraint ingredients_quantity_on_hand_not_negative check (quantity_on_hand >= 0);

-- ---------------------------------------------------------------- place_order v3

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
  if p_client_ref is not null then
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

-- ---------------------------------------------------------------- add_stock

create function public.add_stock(p_ingredient_id bigint, p_quantity numeric, p_note text default null)
returns numeric
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_note text := coalesce(btrim(p_note), '');
  v_new numeric;
begin
  if public.auth_role() is null or public.auth_role() not in ('manager', 'owner') then
    raise exception 'Only a manager or owner can add stock' using errcode = '42501';
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
  insert into public.stock_movements (ingredient_id, change, reason, note)
  values (p_ingredient_id, p_quantity, 'restock', v_note);

  select quantity_on_hand into v_new from public.ingredients where id = p_ingredient_id;
  return v_new;
end;
$$;

revoke execute on function public.add_stock(bigint, numeric, text) from public, anon;
grant execute on function public.add_stock(bigint, numeric, text) to authenticated;

-- ---------------------------------------------------------------- realtime

-- RLS applies: only manager/owner receive these events.
alter publication supabase_realtime add table public.ingredients, public.stock_movements;
