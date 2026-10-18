-- Key Solutions demo: core schema.
-- Tables, enums, indexes and the triggers that keep data honest.
-- RLS and grants live in the next migration.

-- ---------------------------------------------------------------- enums

create type public.app_role as enum ('waiter', 'cook', 'manager', 'owner');

-- Order of values matters: status may only move one step forward.
create type public.order_status as enum ('sent', 'preparing', 'ready', 'served', 'paid');

create type public.stock_reason as enum ('order', 'restock', 'adjustment');

-- ---------------------------------------------------------------- tables

create table public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  full_name  text not null default '',
  role       public.app_role not null default 'waiter',
  created_at timestamptz not null default now()
);

create table public.dining_tables (
  id     bigint generated always as identity primary key,
  number integer not null unique check (number > 0),
  seats  integer not null check (seats > 0)
);

create table public.menu_categories (
  id         bigint generated always as identity primary key,
  name       text not null unique,
  sort_order integer not null default 0
);

create table public.menu_items (
  id           bigint generated always as identity primary key,
  category_id  bigint not null references public.menu_categories (id),
  name         text not null unique,
  description  text not null default '',
  price_etb    numeric(10, 2) not null check (price_etb >= 0),
  image_url    text,
  is_available boolean not null default true,
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now()
);

create table public.orders (
  id           bigint generated always as identity primary key,
  table_id     bigint not null references public.dining_tables (id),
  waiter_id    uuid not null default auth.uid() references public.profiles (id),
  status       public.order_status not null default 'sent',
  created_at   timestamptz not null default now(),
  preparing_at timestamptz,
  ready_at     timestamptz,
  served_at    timestamptz,
  paid_at      timestamptz,
  updated_at   timestamptz not null default now()
);

create table public.order_items (
  id             bigint generated always as identity primary key,
  order_id       bigint not null references public.orders (id) on delete cascade,
  menu_item_id   bigint not null references public.menu_items (id),
  quantity       integer not null check (quantity > 0),
  note           text not null default '',
  -- Copied from menu_items.price_etb by trigger at insert time; clients cannot set it.
  unit_price_etb numeric(10, 2) not null default 0 check (unit_price_etb >= 0)
);

create table public.ingredients (
  id                  bigint generated always as identity primary key,
  name                text not null unique,
  unit                text not null check (unit in ('kg', 'L', 'pcs')),
  -- Changed only by the stock_movements trigger, never by app code.
  quantity_on_hand    numeric(12, 3) not null default 0,
  low_stock_threshold numeric(12, 3) not null default 0 check (low_stock_threshold >= 0)
);

create table public.recipe_items (
  menu_item_id      bigint not null references public.menu_items (id) on delete cascade,
  ingredient_id     bigint not null references public.ingredients (id),
  quantity_per_item numeric(12, 3) not null check (quantity_per_item > 0),
  primary key (menu_item_id, ingredient_id)
);

create table public.stock_movements (
  id            bigint generated always as identity primary key,
  ingredient_id bigint not null references public.ingredients (id),
  change        numeric(12, 3) not null check (change <> 0),
  reason        public.stock_reason not null,
  order_id      bigint references public.orders (id) on delete set null,
  created_by    uuid default auth.uid() references public.profiles (id),
  created_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------- indexes

create index menu_items_category_id_idx on public.menu_items (category_id);
create index orders_table_id_idx on public.orders (table_id);
create index orders_waiter_id_idx on public.orders (waiter_id);
create index orders_status_created_at_idx on public.orders (status, created_at desc);
create index order_items_order_id_idx on public.order_items (order_id);
create index order_items_menu_item_id_idx on public.order_items (menu_item_id);
create index recipe_items_ingredient_id_idx on public.recipe_items (ingredient_id);
create index stock_movements_ingredient_id_idx on public.stock_movements (ingredient_id, created_at desc);
create index stock_movements_order_id_idx on public.stock_movements (order_id);
create index stock_movements_created_by_idx on public.stock_movements (created_by);

-- ---------------------------------------------------------------- helpers

-- Role of the signed-in user (null when not signed in). Used by RLS policies.
create function public.auth_role()
returns public.app_role
language sql
stable
security definer
set search_path = ''
as $$
  select role from public.profiles where id = auth.uid();
$$;

-- ---------------------------------------------------------------- profiles on signup

-- Role comes from app_metadata.role (only settable with the service role key),
-- never from user_metadata, so nobody can sign themselves up as owner.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested text := new.raw_app_meta_data ->> 'role';
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    case
      when requested in ('waiter', 'cook', 'manager', 'owner') then requested::public.app_role
      else 'waiter'::public.app_role
    end
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------- orders

-- New orders always start as 'sent' with fresh timestamps.
create function public.orders_before_insert()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.status := 'sent';
  new.created_at := now();
  new.updated_at := now();
  new.preparing_at := null;
  new.ready_at := null;
  new.served_at := null;
  new.paid_at := null;
  return new;
end;
$$;

create trigger orders_before_insert
  before insert on public.orders
  for each row execute function public.orders_before_insert();

-- Status moves exactly one step forward, by the right role, and stamps its time.
--   cook:            sent -> preparing -> ready
--   waiter:          ready -> served -> paid
--   manager/owner:   any single forward step
create function public.orders_before_update()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  statuses public.order_status[] := enum_range(null::public.order_status);
  r public.app_role := public.auth_role();
begin
  if new.table_id <> old.table_id
     or new.waiter_id <> old.waiter_id
     or new.created_at <> old.created_at then
    raise exception 'Only an order''s status can change';
  end if;

  -- Timestamps are owned by this trigger.
  new.preparing_at := old.preparing_at;
  new.ready_at := old.ready_at;
  new.served_at := old.served_at;
  new.paid_at := old.paid_at;

  if new.status <> old.status then
    if array_position(statuses, new.status) <> array_position(statuses, old.status) + 1 then
      raise exception 'Order status cannot go from % to %', old.status, new.status;
    end if;

    -- auth.uid() is null for service-role / SQL maintenance; skip the role check then.
    if auth.uid() is not null then
      if r = 'cook' and new.status not in ('preparing', 'ready') then
        raise exception 'A cook can only mark orders preparing or ready';
      elsif r = 'waiter' and new.status not in ('served', 'paid') then
        raise exception 'A waiter can only mark orders served or paid';
      elsif r is null then
        raise exception 'No staff profile for this user';
      end if;
    end if;

    case new.status
      when 'preparing' then new.preparing_at := now();
      when 'ready' then new.ready_at := now();
      when 'served' then new.served_at := now();
      when 'paid' then new.paid_at := now();
      else null;
    end case;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

create trigger orders_before_update
  before update on public.orders
  for each row execute function public.orders_before_update();

-- ---------------------------------------------------------------- order items

-- Copy the current menu price into the line; refuse unavailable items.
create function public.order_items_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  price numeric(10, 2);
  available boolean;
begin
  select price_etb, is_available into price, available
  from public.menu_items where id = new.menu_item_id;

  if price is null then
    raise exception 'Menu item % does not exist', new.menu_item_id;
  elsif not available then
    raise exception 'Menu item % is not available', new.menu_item_id;
  end if;

  new.unit_price_etb := price;
  return new;
end;
$$;

create trigger order_items_before_insert
  before insert on public.order_items
  for each row execute function public.order_items_before_insert();

-- ---------------------------------------------------------------- stock

-- The only path that changes ingredients.quantity_on_hand.
create function public.apply_stock_movement()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.ingredients
  set quantity_on_hand = quantity_on_hand + new.change
  where id = new.ingredient_id;
  return new;
end;
$$;

create trigger stock_movements_after_insert
  after insert on public.stock_movements
  for each row execute function public.apply_stock_movement();

-- Trigger functions are not meant to be called directly.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.apply_stock_movement() from public, anon, authenticated;
revoke execute on function public.order_items_before_insert() from public, anon, authenticated;
revoke execute on function public.auth_role() from public, anon;
grant execute on function public.auth_role() to authenticated;
