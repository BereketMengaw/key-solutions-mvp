# Slice 4 — Stock and the owner website

**Status:** done 2026-10-18 — code-quality PASS (after one round of fixes)
**Agents:** `ui-designer` + `backend` + `mobile` (fixes) in parallel → `web` → `code-quality`

## Goal

Every order deducts its ingredients automatically. The owner/manager opens the website,
sees every ingredient's level, sees low stock flagged, and adds stock when a delivery
arrives. This is the first slice of the website, so it also sets up the web app itself.

## UI designer builds

- `design/screens/04-web-shell.md` — the website frame used by every page from now on:
  login page (same brand as the app), sidebar/top nav (Dashboard, Stock, Menu — Dashboard
  and Menu can be placeholders this slice), signed-in user + role, sign out, wrong-role
  page for waiter/cook ("use the mobile app"). Laptop first, usable on a phone.
- `design/screens/04-stock.md` — stock page: every ingredient with quantity + unit, a level
  bar against its threshold, low-stock rows clearly flagged (colour + text + icon), a
  low-stock count at the top, search/filter by "low only". **Add stock** flow (drawer or
  modal): pick ingredient, amount, optional note → confirm → level updates live, alert
  clears if back above threshold. Recent stock movements list (order deductions vs
  restocks) per ingredient or overall.
- Tokens for web if needed (Tailwind consumes `design/tokens.ts`).

## Backend builds

- Stock deduction inside `place_order`, same transaction: for each line, quantity ×
  `recipe_items.quantity_per_item` written as `order` stock movements.
- **Not enough stock → the order is rejected** with a friendly message naming the
  ingredient ("Not enough Beef for 2 × Beef Tibs"), nothing written.
- `add_stock(p_ingredient_id, p_quantity, p_note)` RPC — manager/owner only, positive
  amounts only, writes a `restock` movement.
- Realtime on `ingredients` (and `stock_movements` if useful) for manager/owner.
- Regenerate types; README updated.

## Mobile builds (slice 3 review fixes)

- Kitchen board: sequence-guard `loadBoard` so an older refetch never overwrites a newer
  one; same guard in `orders.tsx` `load`.
- Move the order's client ref into `DraftProvider`; clear it on any draft edit or `clear()`,
  so leaving and re-entering the cart can't create a duplicate.
- Remove the dead `old.status` check in `live.tsx`.
- Show the backend's "Not enough …" message cleanly in the cart.

## Web builds

- New Next.js app in `web/` (App Router, TypeScript, Tailwind themed from `design/tokens.ts`,
  `@supabase/ssr`), role-protected on the server.
- Login, shell, wrong-role page, Stock page with Add stock, all per design.
- Stock levels update live.

## Done when

1. Owner logs in on the website → Stock page lists 16 ingredients; beef shows **5.3 kg**, not flagged.
2. Waiter sends Table 4: 2 Beef Tibs + 1 Macchiato → beef drops to **4.8 kg** on the website **live** and is flagged low (threshold 5 kg).
3. Owner adds **+10 kg beef** → beef shows **14.8 kg**, flag clears; the movement list shows the order deduction and the restock.
4. An order needing more beef than is left is rejected with "Not enough Beef…" and nothing is deducted.
5. Waiter or cook logging into the website sees "use the mobile app"; a waiter calling `add_stock` is refused.
6. Mobile slice 3 fixes in; typecheck/lint pass in `mobile/` and `web/`; `npm run build` passes in `web/`.
7. `code-quality` passes; demo data reset (0 orders, beef 5.3).
