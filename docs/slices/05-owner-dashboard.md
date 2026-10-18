# Slice 5 — Owner dashboard

**Status:** done 2026-10-18 — code-quality PASS
**Agents:** `ui-designer` + `backend` (parallel) → `web` → `code-quality`

## Goal

The owner opens the website and in five seconds knows how the day is going: money in,
orders, what's selling, what's happening on the floor right now, and what's running out.
Everything updates live while the client watches the waiter and kitchen demo.

## UI designer builds

`design/screens/05-dashboard.md` — replaces the "Coming next" placeholder at `/dashboard`,
which becomes the landing page for owner/manager:

- **Today's numbers (tiles):** sales today (ETB, paid orders only), orders today, average
  order value, open orders right now. Each tile can show a small comparison or context line
  but must not invent history we don't have.
- **Sales by hour:** simple bar chart of today's paid sales per hour (Addis time).
- **Top items today:** top 5 menu items by quantity, with revenue.
- **Live floor:** orders by status (Sent / Preparing / Ready / Served) with table numbers and
  how long they've been waiting; the same status colours as the app.
- **Payment mix:** Cash / Telebirr / CBE Birr split of today's paid sales.
- **Stock alerts:** low items with a link to Stock.
- Live arrival behaviour (numbers tick up, new order appears), empty state for a fresh
  morning (0 orders — this is what the client sees first after a reset), loading, error.
- Laptop first; phone usable.
- Chart styling per the `dataviz` guidance and the existing tokens; no chart library unless
  the design proves it's needed (plain SVG/CSS bars are enough).
- `/menu` placeholder stays "Coming next".

## Backend builds

- One read function for the dashboard, e.g. `dashboard_today()` returning JSON with the
  tile numbers, sales by hour, top items, payment mix — manager/owner only, "today" in
  Africa/Addis_Ababa time.
- Realtime already covers `orders`, `order_items`, `ingredients`; confirm the dashboard can
  refresh on those events.
- Seed option for a believable demo day: a script that creates ~25 paid orders spread across
  today's hours with a realistic item and payment mix, so the dashboard isn't empty when the
  client first sees it. The plain seed (0 orders) stays the default; this is an extra
  `demo-day` script.

## Web builds

- `/dashboard` per design, live, landing page after login.
- Sequence-guarded refetch on realtime events, refetch on subscribe.

## Done when

1. After plain reset, owner sees the dashboard with a clean "no orders yet today" state — not zeros that look broken.
2. Waiter sends Table 4 (2 Beef Tibs + 1 Macchiato) → **Open orders 1** and the Live floor shows Table 4 · Sent, live, no reload.
3. Cook moves it to Preparing → Ready; waiter marks Served then Paid (Telebirr) → **Sales today 1,370 ETB**, Orders 1, Top items Beef Tibs ×2 and Macchiato ×1, payment mix 100% Telebirr — all live.
4. Run the demo-day script → dashboard shows a believable full day (sales by hour, top 5, payment mix).
5. Waiter/cook can't call `dashboard_today()`.
6. typecheck/lint/build pass; `code-quality` passes; data reset.
