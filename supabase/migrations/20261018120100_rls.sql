-- Key Solutions demo: grants and row level security.
--
--   waiter         reads menu + tables, creates orders, marks own flow served/paid
--   cook           reads menu + orders, moves orders to preparing/ready
--   manager/owner  read everything (stock is added through an RPC in slice 4)
--
-- Nothing is exposed to anon. Table privileges are revoked and re-granted
-- narrowly, so RLS is a second wall, not the only one.

-- ---------------------------------------------------------------- grants

revoke all on table
  public.profiles,
  public.dining_tables,
  public.menu_categories,
  public.menu_items,
  public.orders,
  public.order_items,
  public.ingredients,
  public.recipe_items,
  public.stock_movements
from anon, authenticated;

grant select on table
  public.profiles,
  public.dining_tables,
  public.menu_categories,
  public.menu_items,
  public.orders,
  public.order_items,
  public.ingredients,
  public.recipe_items,
  public.stock_movements
to authenticated;

grant insert (table_id, waiter_id) on public.orders to authenticated;
grant update (status) on public.orders to authenticated;
grant insert (order_id, menu_item_id, quantity, note) on public.order_items to authenticated;

-- ---------------------------------------------------------------- enable RLS

alter table public.profiles enable row level security;
alter table public.dining_tables enable row level security;
alter table public.menu_categories enable row level security;
alter table public.menu_items enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.ingredients enable row level security;
alter table public.recipe_items enable row level security;
alter table public.stock_movements enable row level security;

-- ---------------------------------------------------------------- policies

-- Staff list (names + roles) is visible to every signed-in staff member,
-- so the kitchen can show who took an order.
create policy "staff read profiles"
  on public.profiles for select to authenticated
  using ((select public.auth_role()) is not null);

create policy "staff read tables"
  on public.dining_tables for select to authenticated
  using ((select public.auth_role()) is not null);

create policy "staff read menu categories"
  on public.menu_categories for select to authenticated
  using ((select public.auth_role()) is not null);

create policy "staff read menu items"
  on public.menu_items for select to authenticated
  using ((select public.auth_role()) is not null);

-- Orders: every staff role sees them (waiter needs "ready", cook needs the queue).
create policy "staff read orders"
  on public.orders for select to authenticated
  using ((select public.auth_role()) is not null);

create policy "waiter creates own orders"
  on public.orders for insert to authenticated
  with check (
    (select public.auth_role()) in ('waiter', 'manager', 'owner')
    and waiter_id = (select auth.uid())
  );

-- Which transitions each role may make is enforced by the orders_before_update trigger.
create policy "staff update order status"
  on public.orders for update to authenticated
  using ((select public.auth_role()) is not null)
  with check ((select public.auth_role()) is not null);

create policy "staff read order items"
  on public.order_items for select to authenticated
  using ((select public.auth_role()) is not null);

create policy "waiter adds items to own new order"
  on public.order_items for insert to authenticated
  with check (
    (select public.auth_role()) in ('waiter', 'manager', 'owner')
    and exists (
      select 1 from public.orders o
      where o.id = order_id
        and o.waiter_id = (select auth.uid())
        and o.status = 'sent'
    )
  );

-- Stock and recipes: manager/owner only. No insert/update/delete policies:
-- stock changes go through security-definer functions (add_stock, slice 4).
create policy "managers read ingredients"
  on public.ingredients for select to authenticated
  using ((select public.auth_role()) in ('manager', 'owner'));

create policy "managers read recipes"
  on public.recipe_items for select to authenticated
  using ((select public.auth_role()) in ('manager', 'owner'));

create policy "managers read stock movements"
  on public.stock_movements for select to authenticated
  using ((select public.auth_role()) in ('manager', 'owner'));
