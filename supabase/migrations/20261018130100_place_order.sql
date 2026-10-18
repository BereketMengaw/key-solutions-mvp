-- Key Solutions demo: place_order RPC for the waiter app.
--
--   supabase.rpc('place_order', {
--     p_table_id: 4,
--     p_items: [{ menu_item_id: 5, quantity: 2, note: 'no onion' }, ...],
--   })  -> new order id (bigint)
--
-- One call = one transaction: the order and all its lines go in together or not at all.
-- Runs as the caller (security invoker), so the existing RLS policies, column grants and
-- triggers still apply: status starts at 'sent', prices are copied from the menu.
-- Stock deduction is added to this function in slice 4.

create function public.place_order(p_table_id bigint, p_items jsonb)
returns bigint
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_order_id bigint;
  v_item jsonb;
  v_menu_item_id numeric;
  v_quantity numeric;
  v_available boolean;
begin
  if public.auth_role() is distinct from 'waiter' then
    raise exception 'Only a waiter can place orders' using errcode = '42501';
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

  insert into public.orders (table_id)
  values (p_table_id)
  returning id into v_order_id;

  insert into public.order_items (order_id, menu_item_id, quantity, note)
  select
    v_order_id,
    (e.value ->> 'menu_item_id')::bigint,
    (e.value ->> 'quantity')::integer,
    coalesce(btrim(e.value ->> 'note'), '')
  from jsonb_array_elements(p_items) with ordinality as e(value, ord)
  order by e.ord;

  return v_order_id;
end;
$$;

revoke execute on function public.place_order(bigint, jsonb) from public, anon;
grant execute on function public.place_order(bigint, jsonb) to authenticated;
