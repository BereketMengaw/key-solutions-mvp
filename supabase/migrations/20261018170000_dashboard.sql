-- Key Solutions demo: owner dashboard (slice 5).
--
--   dashboard_today() -> jsonb   manager/owner only; everything the dashboard shows,
--                                in one round trip. JSON shape: supabase/README.md and
--                                shared/dashboard.ts.
--
-- "Today" is the current calendar day in Africa/Addis_Ababa (UTC+3, no DST).
--
-- Why SECURITY INVOKER (not definer):
--   Manager/owner can already read every table it touches (orders, order_items,
--   menu_items, dining_tables, profiles, ingredients) through RLS, so running as the
--   caller gives the right numbers without any extra privilege. The explicit role check
--   at the top turns a waiter/cook call into a clear 42501 instead of a half-empty result
--   (they can read orders but not ingredients). search_path = '' and qualified names
--   anyway, so the function behaves the same whatever the caller's search_path.

-- ---------------------------------------------------------------- indexes

-- Today's paid orders (sales, by hour, payment mix) and today's orders.
create index orders_paid_at_idx on public.orders (paid_at) where paid_at is not null;
create index orders_created_at_idx on public.orders (created_at);

-- ---------------------------------------------------------------- dashboard_today

create function public.dashboard_today()
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_tz    constant text := 'Africa/Addis_Ababa';
  v_day   date := (now() at time zone v_tz)::date;
  v_start timestamptz := v_day::timestamp at time zone v_tz;
  v_end   timestamptz := (v_day + 1)::timestamp at time zone v_tz;
  v_role  public.app_role := public.auth_role();
  v_result jsonb;
begin
  if v_role is null or v_role not in ('manager', 'owner') then
    raise exception 'Only a manager or owner can see the dashboard' using errcode = '42501';
  end if;

  with
  order_totals as (
    select oi.order_id,
           sum(oi.quantity * oi.unit_price_etb) as total_etb,
           sum(oi.quantity)::integer as item_count
    from public.order_items oi
    group by oi.order_id
  ),
  -- Paid today = paid_at falls on today (Addis), whenever the order was sent.
  paid as (
    select o.id, o.paid_at, o.payment_method, coalesce(t.total_etb, 0) as total_etb
    from public.orders o
    left join order_totals t on t.order_id = o.id
    where o.paid_at >= v_start and o.paid_at < v_end
  ),
  -- Open = not paid yet, whatever day it was sent (it is on the floor right now).
  open_orders as (
    select o.id, dt.number as table_number, o.status, o.created_at,
           case o.status
             when 'sent' then o.created_at
             when 'preparing' then o.preparing_at
             when 'ready' then o.ready_at
             when 'served' then o.served_at
           end as status_at,
           coalesce(t.item_count, 0) as item_count,
           coalesce(p.full_name, '') as waiter_name,
           coalesce(t.total_etb, 0) as total_etb
    from public.orders o
    join public.dining_tables dt on dt.id = o.table_id
    left join public.profiles p on p.id = o.waiter_id
    left join order_totals t on t.order_id = o.id
    where o.status <> 'paid'
  ),
  totals as (
    select coalesce(sum(total_etb), 0) as sales_etb, count(*)::integer as paid_orders
    from paid
  ),
  -- What is selling today: every order sent today, paid or not.
  top_items as (
    select mi.id as menu_item_id, mi.name,
           sum(oi.quantity)::integer as quantity,
           sum(oi.quantity * oi.unit_price_etb) as revenue_etb
    from public.orders o
    join public.order_items oi on oi.order_id = o.id
    join public.menu_items mi on mi.id = oi.menu_item_id
    where o.created_at >= v_start and o.created_at < v_end
    group by mi.id, mi.name
    order by quantity desc, revenue_etb desc, mi.name
    limit 5
  )
  select jsonb_build_object(
    'date', v_day,
    'timezone', v_tz,
    'generated_at', now(),
    'sales_etb', tt.sales_etb,
    'paid_orders', tt.paid_orders,
    'orders_today', (
      select count(*)::integer from public.orders o
      where o.created_at >= v_start and o.created_at < v_end
    ),
    'average_order_etb',
      case when tt.paid_orders = 0 then 0 else round(tt.sales_etb / tt.paid_orders, 2) end,
    'open_orders', (select count(*)::integer from open_orders),
    'sales_by_hour', (
      select jsonb_agg(jsonb_build_object('hour', h.hour, 'sales_etb', coalesce(s.sales_etb, 0))
                       order by h.hour)
      from generate_series(0, 23) as h(hour)
      left join (
        select extract(hour from paid_at at time zone v_tz)::integer as hour,
               sum(total_etb) as sales_etb
        from paid group by 1
      ) s on s.hour = h.hour
    ),
    'top_items', coalesce((
      select jsonb_agg(jsonb_build_object(
               'menu_item_id', ti.menu_item_id, 'name', ti.name,
               'quantity', ti.quantity, 'revenue_etb', ti.revenue_etb)
             order by ti.quantity desc, ti.revenue_etb desc, ti.name)
      from top_items ti
    ), '[]'::jsonb),
    'payment_mix', (
      select jsonb_agg(jsonb_build_object(
               'method', m.method,
               'sales_etb', coalesce(x.sales_etb, 0),
               'orders', coalesce(x.orders, 0))
             order by m.ord)
      from unnest(enum_range(null::public.payment_method)) with ordinality as m(method, ord)
      left join (
        select payment_method, sum(total_etb) as sales_etb, count(*)::integer as orders
        from paid group by payment_method
      ) x on x.payment_method = m.method
    ),
    'live_floor', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', oo.id, 'table_number', oo.table_number, 'status', oo.status,
               'created_at', oo.created_at, 'status_at', oo.status_at,
               'item_count', oo.item_count, 'waiter_name', oo.waiter_name,
               'total_etb', oo.total_etb)
             order by oo.created_at, oo.id)
      from open_orders oo
    ), '[]'::jsonb),
    'low_stock', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', i.id, 'name', i.name, 'unit', i.unit,
               'quantity_on_hand', i.quantity_on_hand,
               'low_stock_threshold', i.low_stock_threshold)
             order by i.quantity_on_hand / i.low_stock_threshold, i.name)
      from public.ingredients i
      where i.quantity_on_hand < i.low_stock_threshold
    ), '[]'::jsonb)
  )
  into v_result
  from totals tt;

  return v_result;
end;
$$;

revoke execute on function public.dashboard_today() from public, anon;
grant execute on function public.dashboard_today() to authenticated;
