-- Key Solutions demo: place_order v2.
--
--   supabase.rpc('place_order', {
--     p_table_id: 4,
--     p_items: [{ menu_item_id: 5, quantity: 2, note: 'no onion' }, ...],
--     p_client_ref: '<uuid made once per order on the phone>',   // optional
--   })  -> order id (bigint)
--
-- Changes from v1:
--   - Whole numbers written as decimals (1.0) are accepted as 1. Before, they passed the
--     check but failed the final ::integer cast with a raw 22P02.
--   - p_client_ref makes retries safe: calling again with the same ref returns the order
--     that ref already created, instead of a second order. A ref belongs to the waiter
--     who used it first; another waiter reusing it gets a 22023 error, never that order.
--   - The old 2-argument call still works (p_client_ref defaults to null = no dedupe).

alter table public.orders add column client_ref uuid;
alter table public.orders add constraint orders_client_ref_key unique (client_ref);

grant insert (client_ref) on public.orders to authenticated;

drop function public.place_order(bigint, jsonb);

create function public.place_order(p_table_id bigint, p_items jsonb, p_client_ref uuid default null)
returns bigint
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_order_id bigint;
  v_owner uuid;
  v_item jsonb;
  v_menu_item_id numeric;
  v_quantity numeric;
  v_available boolean;
begin
  if public.auth_role() is distinct from 'waiter' then
    raise exception 'Only a waiter can place orders' using errcode = '42501';
  end if;

  -- A retry of an order that already went through: hand back the same id.
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

  begin
    insert into public.orders (table_id, client_ref)
    values (p_table_id, p_client_ref)
    returning id into v_order_id;
  exception when unique_violation then
    -- Two calls with the same ref raced; the other one won.
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

  return v_order_id;
end;
$$;

revoke execute on function public.place_order(bigint, jsonb, uuid) from public, anon;
grant execute on function public.place_order(bigint, jsonb, uuid) to authenticated;
