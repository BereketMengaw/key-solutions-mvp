# Supabase backend

Remote project `sjowmyyzehqjojnjnohe` (free tier, eu-central-1). No local Docker stack is needed;
everything below runs against the remote. Keys live in the repo-root `.env` (gitignored).

## Demo logins

All four share one password: **`KeyDemo2026!`**

| Role    | Email                       | Name          | Lands on        |
|---------|-----------------------------|---------------|-----------------|
| waiter  | `waiter@keysolutions.demo`  | Hana Tesfaye  | mobile, orders  |
| cook    | `cook@keysolutions.demo`    | Dawit Bekele  | mobile, kitchen |
| manager | `manager@keysolutions.demo` | Selam Girma   | website         |
| owner   | `owner@keysolutions.demo`   | Abebe Kebede  | website         |

## Commands (run from the repo root)

```bash
source .env

# 1. Apply new migrations
supabase db push --linked -p "$SUPABASE_DB_PASSWORD"
supabase migration list --linked -p "$SUPABASE_DB_PASSWORD"

# 2. Load / reset demo data (wipes tables, menu, stock and ALL orders; keeps users)
supabase db query --linked -f supabase/seed.sql

# 3. Create or reset the 4 demo logins (safe to re-run)
bash supabase/scripts/create-demo-users.sh

# 4. Regenerate shared types after any schema change
supabase gen types typescript --project-id "$SUPABASE_PROJECT_REF" 2>/dev/null > shared/database.types.ts

# 5. Push auth/API settings from config.toml (review the diff; answer y only for the
#    services you meant to change; pooler/storage stay as they are on the dashboard)
supabase config diff
supabase config push
```

Before a client demo, run step 2: it clears old orders and puts beef back at 5.3 kg
(threshold 5 kg), so the demo order of 2 Beef Tibs triggers the low-stock alert.

## Data model

| Table             | Notes |
|-------------------|-------|
| `profiles`        | One per staff user. Made by trigger when `app_metadata.role` (service-role only) is set to a valid role, on create or later; no role, no profile, no access. Setting the role to null or anything invalid deletes the profile, or, if orders/stock movements reference it, keeps it with `role = null` (name stays for history, access is gone). `role` has no default and is nullable for that reason. |
| `dining_tables`   | Tables 1–8. |
| `menu_categories` | Breakfast, Main dishes, Hot drinks, Cold drinks (`sort_order`). |
| `menu_items`      | 14 items, `price_etb numeric(10,2)`, `is_available`, `image_url` (empty for now). |
| `orders`          | `status` + one timestamp per status, set by trigger. `payment_method` (`cash`/`telebirr`/`cbe_birr`) is set exactly when the order becomes `paid`. `client_ref` (uuid, unique, nullable) is the idempotency key from `place_order`. |
| `order_items`     | `unit_price_etb` is copied from the menu by trigger; clients don't send it. |
| `ingredients`     | `quantity_on_hand` is changed only by the `stock_movements` trigger. |
| `recipe_items`    | Ingredient use per one item sold. Every menu item has a recipe. |
| `stock_movements` | Append-only ledger (`order`, `restock`, `adjustment`). Opening stock is seeded as `adjustment`. |

## Auth

- **Public signup is off** on the hosted project (`[auth] enable_signup = false`, pushed with
  `supabase config push`). `/auth/v1/signup` returns `422 signup_disabled`.
  Staff logins are made only with the service-role admin API (`scripts/create-demo-users.sh`).
- The `[auth]` values in `config.toml` mirror the hosted project (site URL, email confirmations,
  OTP, TOTP MFA), so `config push` changes nothing there by accident.

## RPCs

### `place_order(p_table_id bigint, p_items jsonb, p_client_ref uuid default null) returns bigint`

Waiter only. Inserts the order and all its lines in one transaction and returns the order id.

```ts
const { data: orderId, error } = await supabase.rpc('place_order', {
  p_table_id: 4,                       // dining_tables.id
  p_items: [
    { menu_item_id: 5, quantity: 2, note: 'no onion' },  // note optional, max 200 chars
    { menu_item_id: 9, quantity: 1 },
  ],
  p_client_ref: clientRef,             // crypto.randomUUID(), made ONCE per order, reused on retry
});
```

- **Idempotent with `p_client_ref`:** a repeat call with the same ref returns the order that ref
  already created (no second order, items in the repeat are ignored). Make the uuid when the
  waiter taps Send and keep it until the call succeeds. Without a ref (old 2-arg call) every call
  makes a new order.
- Whole numbers written as decimals (`2.0`) are accepted.
- Status starts at `sent`; `unit_price_etb` is copied from the menu by trigger.
- Errors (`error.code` / `error.message`), nothing is written on any error:
  - `42501` "Only a waiter can place orders" (HTTP 403; anon gets 401)
  - `22023` "An order needs at least one item", "Table N does not exist",
    "Quantity must be a whole number from 1 to 99", "Menu item N does not exist",
    "Menu item N is not available", "Each item needs a numeric menu_item_id and quantity",
    "This order reference is already used" (another waiter's ref)
- Security invoker: RLS and column grants still apply. Stock deduction joins it in slice 4.

### Moving an order along (plain table update, no RPC)

```ts
// cook
await supabase.from('orders').update({ status: 'preparing' }).eq('id', orderId);
await supabase.from('orders').update({ status: 'ready' }).eq('id', orderId);
// waiter
await supabase.from('orders').update({ status: 'served' }).eq('id', orderId);
await supabase.from('orders').update({ status: 'paid', payment_method: 'telebirr' }).eq('id', orderId);
```

- `paid` without `payment_method` → `22023` "Choose how the order was paid: cash, telebirr or cbe_birr".
- `payment_method` on any other change, or changing it after paid → `22023`
  "Payment method can only be set when marking the order paid". Unknown method → `22P02`.
- A wrong step or wrong role → `P0001` with a plain message (e.g. "A waiter can only mark orders served or paid").

## Realtime

`orders` and `order_items` are in the `supabase_realtime` publication; events respect RLS.

```ts
// kitchen: every order
supabase.channel('kitchen')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, onOrder)
  .subscribe();
// waiter: own orders only
supabase.channel('my-orders')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `waiter_id=eq.${userId}` }, onOrder)
  .subscribe();
```

- `place_order` writes the order and its lines in one transaction, so when the cook gets the
  `orders` INSERT event the lines are already readable: fetch them with
  `from('order_items').select('quantity, note, menu_items(name)').eq('order_id', id)`.
- Events are not replayed. Re-fetch the board when the channel reports `SUBSCRIBED`
  (first time and after every reconnect) so nothing sent in between is missed.
- A user without a role receives no events.

## Rules enforced in the database

- **RLS** on every table; nothing is visible to `anon`.
  - All staff read profiles, tables, menu, orders, order items.
  - Only manager/owner read ingredients, recipes and stock movements.
  - Waiter (and manager/owner) insert orders for themselves and add items while the order is `sent`.
  - Nobody writes stock directly; `add_stock` RPC arrives in slice 4.
- **Order status** moves one step forward only (`sent → preparing → ready → served → paid`):
  cook sets `preparing`/`ready`, waiter sets `served`/`paid`, manager/owner any step.
  Only `status` and (when marking paid) `payment_method` are updatable.
- **Realtime** is on for `orders` and `order_items` (respects RLS).
- **Role removal**: clearing or invalidating `app_metadata.role` removes access immediately
  (`auth_role()` returns null; existing sessions can read nothing). Deleting an auth user whose
  profile has orders fails until those orders are gone (run the seed first).
- `public.auth_role()` returns the caller's own role (also callable as `rpc('auth_role')`).
