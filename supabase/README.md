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
supabase gen types typescript --project-id "$SUPABASE_PROJECT_REF" 2>/dev/null \
  | grep -v 'new version of Supabase CLI\|We recommend updating regularly' > shared/database.types.ts
```

Before a client demo, run step 2: it clears old orders and puts beef back at 5.3 kg
(threshold 5 kg), so the demo order of 2 Beef Tibs triggers the low-stock alert.

## Data model

| Table             | Notes |
|-------------------|-------|
| `profiles`        | One per auth user, made by trigger on signup. Role comes from `app_metadata.role` (service-role only), default `waiter`. |
| `dining_tables`   | Tables 1–8. |
| `menu_categories` | Breakfast, Main dishes, Hot drinks, Cold drinks (`sort_order`). |
| `menu_items`      | 14 items, `price_etb numeric(10,2)`, `is_available`, `image_url` (empty for now). |
| `orders`          | `status` + one timestamp per status, set by trigger. |
| `order_items`     | `unit_price_etb` is copied from the menu by trigger; clients don't send it. |
| `ingredients`     | `quantity_on_hand` is changed only by the `stock_movements` trigger. |
| `recipe_items`    | Ingredient use per one item sold. Every menu item has a recipe. |
| `stock_movements` | Append-only ledger (`order`, `restock`, `adjustment`). Opening stock is seeded as `adjustment`. |

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
