# Slice 2 — Waiter app

**Status:** done 2026-10-18 — code-quality PASS
**Agents:** `ui-designer` → `backend` → `mobile` → `code-quality`

## Goal

A waiter opens the app on an Android phone, logs in, picks a table, builds an order from the
menu and sends it. The order lands in the database. This is the first thing the client sees,
so it must look finished, not like a prototype.

## UI designer builds (first)

`design/components.md` and `design/screens/02-*.md` for:

1. **Login** — Key Solutions wordmark, email, password, Sign in. Error state for wrong password.
2. **Tables** — grid of 8 tables. Each shows its number and whether it has an open order (any order not yet `paid`). Top bar: waiter's name, sign out.
3. **Menu** — category tabs (Breakfast, Main dishes, Hot drinks, Cold drinks), item cards with name and ETB price, tap to add, +/− quantity on added items. No images exist yet — design a good fallback (initial letter / category color), not a broken image.
4. **Cart / review** — items, quantities, optional note per item ("no onion"), total in ETB, big **Send to kitchen** button. Sending state, success confirmation, error with retry.
5. **My orders** — the waiter's orders today with status badges (from `statusColors`). In this slice it may refresh on pull; live updates arrive in slice 3.

Phone portrait, one-handed. Cook and any non-waiter role: a simple "This account is for the kitchen / website" screen for now.

## Backend builds

- `place_order(p_table_id, p_items jsonb)` RPC: inserts the order and all its lines in one transaction, returns the new order id. Waiter only. Rejects empty orders and unavailable items. (Stock deduction gets added to this same RPC in slice 4.)
- Regenerate `shared/database.types.ts`.

## Mobile builds

- New Expo app in `mobile/` (TypeScript, Expo Router, `@supabase/supabase-js`, session in `expo-secure-store`).
- Supabase URL and anon key from `mobile/.env` as `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY` (gitignored; `mobile/.env.example` committed).
- The 5 screens above, exactly per the design specs, styled only from `design/tokens.ts`.
- Sends orders with the `place_order` RPC.
- All strings in one strings file.
- Scripts: `typecheck`, `lint`, `start`.

## Done when

1. Log in as `waiter@keysolutions.demo` → Tables screen shows 8 tables and the waiter's name.
2. Wrong password → clear error, no crash.
3. Table 4 → add 2 Beef Tibs + 1 Macchiato → cart shows total **1,370 ETB** → Send → success.
4. The order exists in the database: Table 4, status `sent`, 2 lines, prices 650 and 70.
5. My orders shows it with a **Sent** badge; Table 4 shows as having an open order.
6. Log in as `cook@` → sees the "this account is for the kitchen" screen, not the waiter screens.
7. `npm run typecheck` and `npm run lint` pass in `mobile/`; `code-quality` passes.
8. Demo data is reset afterwards (0 orders).
