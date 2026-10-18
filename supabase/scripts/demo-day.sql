-- Key Solutions demo: a believable day of trade, so the owner dashboard isn't empty.
--
-- Run AFTER the plain seed (it refuses if any orders exist):
--   supabase db query --linked -f supabase/seed.sql
--   supabase db query --linked -f supabase/scripts/demo-day.sql
--
-- Creates, all "today" in Africa/Addis_Ababa and never in the future:
--   - 25 paid orders from about 07:00 to a few minutes ago, busiest at lunch and early
--     evening. If it is still early, the same shape is squeezed into the part of today
--     that has passed. Breakfast dishes in the morning, mains at lunch and dinner, juice
--     in the afternoon, coffee and tea all day. Payment: 9 cash / 8 telebirr / 3 cbe_birr
--     in every 20 orders (45 / 40 / 15 %).
--   - 3 open orders: Table 3 sent, Table 6 preparing, Table 2 served. Table 4 stays free
--     for the live demo order.
--   - One 'order' stock movement per ingredient per order (same maths as place_order),
--     so stock and the movement ledger agree. Beef ends between about 0.8 and 3.6 kg
--     whatever the time of day: below its 5 kg threshold, with room for the live 2 Beef Tibs.
--
-- Status timestamps always run sent < preparing < ready < served < paid. The orders
-- triggers stamp now() on every insert/update, so they are switched off inside this
-- transaction only (rolled back with it on any error). Prices are still copied by the
-- order_items trigger and stock still moves through the stock_movements trigger.

begin;

alter table public.orders disable trigger orders_before_insert;
alter table public.orders disable trigger orders_before_update;

-- Adds an order's lines from "Name:qty|Name:qty" and writes its stock movements the way
-- place_order does: one 'order' movement per ingredient, quantity x recipe, summed.
-- Lives in pg_temp (gone with this session) and is dropped at the end anyway; create or
-- replace so a second run in the same session doesn't fail on it.
create or replace function pg_temp.demo_day_lines(p_order bigint, p_tpl text, p_waiter uuid, p_at timestamptz)
returns void
language sql
as $f$
  insert into public.order_items (order_id, menu_item_id, quantity)
  select p_order, mi.id, split_part(l.line, ':', 2)::int
  from unnest(string_to_array(p_tpl, '|')) with ordinality as l(line, ord)
  join public.menu_items mi on mi.name = split_part(l.line, ':', 1)
  order by l.ord;

  insert into public.stock_movements (ingredient_id, change, reason, order_id, created_by, created_at)
  select r.ingredient_id, -sum(oi.quantity * r.quantity_per_item), 'order', p_order, p_waiter, p_at
  from public.order_items oi
  join public.recipe_items r on r.menu_item_id = oi.menu_item_id
  where oi.order_id = p_order
  group by r.ingredient_id
  order by r.ingredient_id;
$f$;

do $$
declare
  v_tz      constant text := 'Africa/Addis_Ababa';
  v_now     timestamptz := now();
  v_day     date := (now() at time zone 'Africa/Addis_Ababa')::date;
  v_waiter  uuid;
  -- Ideal sent times (hours after midnight, Addis): 25 orders, peaks at lunch and evening.
  v_ideal   numeric[] := array[7.15, 7.6, 8.1, 8.5, 9.0, 9.75, 10.5, 11.8, 12.2, 12.45, 12.8,
                               13.15, 13.6, 14.3, 15.5, 16.15, 16.75, 17.5, 18.6, 19.05,
                               19.5, 19.9, 20.3, 20.8, 21.4];
  -- Payment pattern per 20 orders: 9 cash, 8 telebirr, 3 cbe_birr.
  v_pay     text[] := array['cash','telebirr','cash','telebirr','cbe_birr','cash','telebirr',
                            'cash','telebirr','cash','cash','telebirr','cbe_birr','cash',
                            'telebirr','cash','telebirr','cash','telebirr','cbe_birr'];
  -- Item templates per part of the day: "Name:qty|Name:qty".
  v_breakfast text[] := array['Firfir:2|Macchiato:2', 'Chechebsa:1|Buna:2', 'Ful:2|Tea:2',
                              'Enqulal Firfir:1|Macchiato:1|Mango juice:1', 'Beef Tibs:1|Buna:2',
                              'Firfir:1|Ful:1|Macchiato:3', 'Chechebsa:2|Tea:1|Macchiato:1'];
  v_lunch     text[] := array['Beef Tibs:2|Shiro Wot:1|Macchiato:2', 'Kitfo:1|Misir Wot:1|Avocado juice:2',
                              'Shiro Wot:2|Buna:2', 'Kitfo:1|Shiro Wot:1|Spris:2',
                              'Misir Wot:1|Shiro Wot:1|Mango juice:1|Tea:1'];
  v_afternoon text[] := array['Macchiato:3', 'Spris:2|Buna:1', 'Avocado juice:1|Mango juice:1',
                              'Buna:4|Tea:2', 'Shiro Wot:1|Macchiato:1'];
  v_dinner    text[] := array['Beef Tibs:1|Kitfo:1|Buna:3', 'Shiro Wot:1|Misir Wot:1|Tea:2',
                              'Kitfo:1|Mango juice:2', 'Shiro Wot:2|Misir Wot:1|Macchiato:2'];
  v_counts  int[] := array[0, 0, 0, 0];   -- orders so far per part of the day
  v_start   timestamptz;
  v_end     timestamptz;
  v_from    numeric;
  v_to      numeric;
  v_scale   numeric;
  v_sent    timestamptz;
  v_dwell   interval;
  v_hour    int;
  v_part    int;
  v_tpl     text;
  v_table   int;
  v_order   bigint;
  i         int;
  v_open    record;
  v_beef    record;
begin
  if exists (select 1 from public.orders) then
    raise exception 'Orders already exist. Run supabase/seed.sql first, then this script.';
  end if;

  select id into v_waiter from public.profiles where role = 'waiter' order by created_at limit 1;
  if v_waiter is null then
    raise exception 'No waiter profile. Run supabase/scripts/create-demo-users.sh first.';
  end if;

  -- Window for the paid orders' sent times: 07:00 .. 30 minutes ago. If less than 3 hours
  -- of today have passed since 07:00, start earlier (never before midnight).
  v_end := v_now - interval '30 minutes';
  v_start := greatest(
    v_day::timestamp at time zone v_tz,
    least((v_day + time '07:00')::timestamp at time zone v_tz, v_end - interval '3 hours'));
  if v_end <= v_start then
    raise exception 'Too early in the day (Addis) for a demo day; try again after 00:30.';
  end if;

  -- Use the ideal times as they are if the whole day has passed; otherwise squeeze them
  -- linearly into the window so the shape (peaks) is kept.
  v_from := 7;
  v_to := v_ideal[array_length(v_ideal, 1)] + 0.1;
  v_scale := extract(epoch from v_end - v_start) / ((v_to - v_from) * 3600);
  if v_scale > 1 and v_start = (v_day + time '07:00')::timestamp at time zone v_tz then
    v_scale := 1;
  end if;

  for i in 1 .. array_length(v_ideal, 1) loop
    v_sent := v_start + make_interval(secs => ((v_ideal[i] - v_from) * 3600 * v_scale)::double precision);
    v_hour := extract(hour from v_sent at time zone v_tz)::int;
    v_part := case when v_hour < 11 then 1 when v_hour < 15 then 2 when v_hour < 18 then 3 else 4 end;
    v_counts[v_part] := v_counts[v_part] + 1;
    v_tpl := case v_part
      when 1 then v_breakfast[1 + (v_counts[1] - 1) % array_length(v_breakfast, 1)]
      when 2 then v_lunch[1 + (v_counts[2] - 1) % array_length(v_lunch, 1)]
      when 3 then v_afternoon[1 + (v_counts[3] - 1) % array_length(v_afternoon, 1)]
      else v_dinner[1 + (v_counts[4] - 1) % array_length(v_dinner, 1)]
    end;
    v_table := 1 + (i * 5) % 8;            -- spreads over tables 1..8
    -- Sent to paid takes 25-49 minutes (never past now).
    v_dwell := least(make_interval(mins => 25 + (i * 7) % 25), (v_now - v_sent) * 0.9);

    insert into public.orders (table_id, waiter_id, status, payment_method,
                               created_at, preparing_at, ready_at, served_at, paid_at, updated_at)
    select dt.id, v_waiter, 'paid', v_pay[1 + (i - 1) % 20]::public.payment_method,
           v_sent,
           v_sent + v_dwell * 0.06,
           v_sent + v_dwell * 0.40,
           v_sent + v_dwell * 0.48,
           v_sent + v_dwell,
           v_sent + v_dwell
    from public.dining_tables dt where dt.number = v_table
    returning id into v_order;

    perform pg_temp.demo_day_lines(v_order, v_tpl, v_waiter, v_sent);
  end loop;

  -- Open orders on the floor right now.
  for v_open in
    select * from (values
      (2, 'served'::public.order_status,    interval '38 minutes', 'Kitfo:1|Misir Wot:1|Macchiato:2'),
      (6, 'preparing'::public.order_status, interval '11 minutes', 'Beef Tibs:2|Shiro Wot:1|Mango juice:2|Buna:2'),
      (3, 'sent'::public.order_status,      interval '3 minutes',  'Beef Tibs:1|Avocado juice:1')
    ) as o(table_number, status, age, tpl)
  loop
    v_sent := v_now - v_open.age;
    insert into public.orders (table_id, waiter_id, status, created_at,
                               preparing_at, ready_at, served_at, updated_at)
    select dt.id, v_waiter, v_open.status, v_sent,
           case when v_open.status >= 'preparing' then v_sent + v_open.age * 0.1 end,
           case when v_open.status >= 'ready' then v_sent + v_open.age * 0.6 end,
           case when v_open.status >= 'served' then v_sent + v_open.age * 0.75 end,
           v_sent + v_open.age * case v_open.status when 'sent' then 0 when 'preparing' then 0.1 else 0.75 end
    from public.dining_tables dt where dt.number = v_open.table_number
    returning id into v_order;

    perform pg_temp.demo_day_lines(v_order, v_open.tpl, v_waiter, v_sent);
  end loop;

  select quantity_on_hand, low_stock_threshold into v_beef from public.ingredients where name = 'Beef';
  if v_beef.quantity_on_hand >= v_beef.low_stock_threshold then
    raise exception 'Beef ended at % (not low); demo day not saved.', v_beef.quantity_on_hand;
  end if;
  -- The live demo order (2 Beef Tibs = 0.5 kg) must still fit.
  if v_beef.quantity_on_hand < 0.5 then
    raise exception 'Beef ended at % (too low for the live 2 Beef Tibs); demo day not saved.', v_beef.quantity_on_hand;
  end if;
end;
$$;

alter table public.orders enable trigger orders_before_insert;
alter table public.orders enable trigger orders_before_update;

drop function pg_temp.demo_day_lines(bigint, text, uuid, timestamptz);

commit;

-- Quick check (the dashboard itself: dashboard_today() as manager/owner).
select
  (select count(*) from public.orders where status = 'paid') as paid_orders,
  (select count(*) from public.orders where status <> 'paid') as open_orders,
  (select sum(oi.quantity * oi.unit_price_etb) from public.order_items oi
     join public.orders o on o.id = oi.order_id where o.status = 'paid') as sales_etb,
  (select quantity_on_hand from public.ingredients where name = 'Beef') as beef_kg;
