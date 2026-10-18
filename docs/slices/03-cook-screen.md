# Slice 3 — Cook screen and live updates

**Status:** done 2026-10-18 — code-quality PASS
**Agents:** `ui-designer` + `backend` (parallel) → `mobile` → `code-quality`

## Goal

The cook sees new orders on a tablet the moment the waiter sends them, moves them to
Preparing and Ready, and the waiter's phone shows Ready live. The waiter then marks the
order Served and Paid, which frees the table. This is the "wow" moment of the demo.

## UI designer builds

- `design/screens/03-kitchen.md` — landscape tablet kitchen board, readable from a metre away.
  Columns or lanes for **New (sent)** and **Preparing**; each ticket shows table number,
  time since sent (live "4 min"), waiter name, items with quantities and notes in large type,
  and one big action button (Start preparing / Mark ready). Ready tickets leave the board
  (optionally a short "Ready" lane that clears). New ticket arrival is unmistakable
  (highlight that fades; no sound needed). Empty state for a quiet kitchen. Connection-lost state.
  Top bar: cook name, live clock, connection indicator, sign out.
- Update `02-my-orders.md` / `02-tables.md` as needed for: live status changes, a clear
  "Ready — pick up" highlight on the waiter's phone, and **Mark served** / **Mark paid** actions
  (paid: choose Cash / Telebirr / CBE Birr — a label only, no real payment).
- **App icon and splash** for the Expo app (K brand mark on primary), as specs plus the
  actual PNG files the mobile agent can drop in (icon 1024×1024, adaptive foreground, splash).
  Put the source and PNGs in `design/brand/`.

## Backend builds

- Fixes from slice 2 review:
  - Removing or invalidating `app_metadata.role` removes the profile's access (delete the profile, or demote it if orders reference it).
  - `place_order` accepts numbers like `1.0` cleanly (cast via numeric) or rejects them with the friendly 22023 message.
  - Idempotency: `place_order` takes an optional `p_client_ref uuid`; a repeat call with the same ref returns the existing order id instead of creating a second order.
- Payment method: `orders.payment_method` (`cash | telebirr | cbe_birr`), set when status becomes `paid`, required for `paid`.
- Confirm Realtime delivers `orders` changes to the cook (all orders) and to the waiter (own orders) under RLS, and that `order_items` for a new order are readable when the cook's screen fetches them.
- Regenerate `shared/database.types.ts`; add payment methods to `shared/constants.ts`.

## Mobile builds

- Kitchen board for `cook` (replaces the "this account is for the kitchen" screen), landscape-friendly, Realtime-driven.
- Waiter: My orders and Tables update live; Ready highlighted; Mark served and Mark paid (with method).
- Slice 2 review fixes: Key Solutions icon + splash (from `design/brand/`), remove `mobile/AGENTS.md`,
  use `ORDER_STATUSES` / `ROLES` constants instead of literals, `eslint-config-expo` → devDependencies,
  send a `p_client_ref` with each order so a retry after a timeout can't duplicate it.
- Realtime subscriptions cleaned up on unmount and re-established after reconnect.

## Done when

1. Cook logs in on a landscape screen → empty kitchen board.
2. Waiter sends Table 4: 2 Beef Tibs + 1 Macchiato → the ticket appears on the cook's board **within ~2 seconds without refreshing**, with items, quantities and the note.
3. Cook taps Start preparing → waiter's My orders shows **Preparing** live. Cook taps Mark ready → waiter sees **Ready** highlighted live.
4. Waiter marks Served, then Paid (Telebirr) → Table 4 shows Free again; DB has `payment_method = telebirr`.
5. Sending the same order twice with the same client ref creates only one order.
6. App icon and splash are Key Solutions, not Expo.
7. typecheck/lint pass; `code-quality` passes; demo data reset (0 orders).
