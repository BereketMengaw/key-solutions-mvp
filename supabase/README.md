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
| `profiles`        | One per staff user. Made by trigger when `app_metadata.role` (service-role only) is set to a valid role, on create or later; no role, no profile, no access. `role` has no default. |
| `dining_tables`   | Tables 1–8. |
| `menu_categories` | Breakfast, Main dishes, Hot drinks, Cold drinks (`sort_order`). |
| `menu_items`      | 14 items, `price_etb numeric(10,2)`, `is_available`, `image_url` (empty for now). |
| `orders`          | `status` + one timestamp per status, set by trigger. |
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

### `place_order(p_table_id bigint, p_items jsonb) returns bigint`

Waiter only. Inserts the order and all its lines in one transaction and returns the new order id.

```ts
const { data: orderId, error } = await supabase.rpc('place_order', {
  p_table_id: 4,                       // dining_tables.id
  p_items: [
    { menu_item_id: 5, quantity: 2, note: 'no onion' },  // note optional, max 200 chars
    { menu_item_id: 9, quantity: 1 },
  ],
});
```

- Status starts at `sent`; `unit_price_etb` is copied from the menu by trigger.
- Errors (`error.code` / `error.message`), nothing is written on any error:
  - `42501` "Only a waiter can place orders" (HTTP 403; anon gets 401)
  - `22023` "An order needs at least one item", "Table N does not exist",
    "Quantity must be a whole number from 1 to 99", "Menu item N does not exist",
    "Menu item N is not available", "Each item needs a numeric menu_item_id and quantity"
- Security invoker: RLS and column grants still apply. Stock deduction joins it in slice 4.

## Rules enforced in the database

- **RLS** on every table; nothing is visible to `anon`.
  - All staff read profiles, tables, menu, orders, order items.
  - Only manager/owner read ingredients, recipes and stock movements.
  - Waiter (and manager/owner) insert orders for themselves and add items while the order is `sent`.
  - Nobody writes stock directly; `add_stock` RPC arrives in slice 4.
- **Order status** moves one step forward only (`sent → preparing → ready → served → paid`):
  cook sets `preparing`/`ready`, waiter sets `served`/`paid`, manager/owner any step.
  Only `status` is updatable.
- **Realtime** is on for `orders` and `order_items` (respects RLS).
- `public.auth_role()` returns the caller's own role (also callable as `rpc('auth_role')`).
