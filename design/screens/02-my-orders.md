# 02 — My orders

> **Slice 3:** live updates, the "Ready — pick up" highlight, Mark served / Mark paid
> and the payment sheet are in `03-waiter-live.md`, which overrides this file where they differ.

Route: waiter tabs → **My orders**.

## Purpose

The waiter's orders from today, newest first, each with its status badge — so the waiter
knows what's in the kitchen and (from slice 3, live) what's ready to carry out. In this
slice it refreshes on focus and on pull.

## Data

- `orders` where `waiter_id = auth.uid()` and `created_at >=` local midnight (the phone's
  today, sent as an ISO timestamp), ordered by `created_at desc`.
- With each order: its `dining_tables.number` and its `order_items`
  (`quantity, note, unit_price_etb, menu_items(name)`), in one query using PostgREST
  embedding.
- Order total = Σ `quantity × unit_price_etb` (the price stored on the line at send
  time, not today's menu price).
- Refetch on screen focus and on pull-to-refresh.

## Layout, top → bottom

1. **`TopBar` `home`**
   - Eyebrow `"Today"`.
   - Title `"My orders"`.
   - Right: nothing (sign out lives on Tables).
2. `spacing[2]`, **Summary strip** (gutter `spacing[4]`), only when ≥ 1 order: a row of
   two stat blocks, gap `spacing[3]`, each `flex: 1`, bg `colors.surface`, radius
   `radius.lg`, border 1 `colors.border`, padding `spacing[3]` `spacing[4]`:
   - `"Orders"` `fontSize.xs` `fontWeight.semibold` `colors.textMuted` / value `"3"`
     `fontSize.xl` / `lineHeight.xl` `fontWeight.bold` `colors.text`.
   - `"Open"` / count of orders with status ≠ `paid`, same styles.
   (No money total for the waiter: sales belong to the owner website.)
3. `spacing[4]`, **Order list** — `FlatList`, gutter `spacing[4]`, gap `spacing[3]`,
   bottom padding `spacing[6]`:
   - Item: `OrderCard` (see components): `"Table 4"` + `StatusBadge` large,
     `"Order #12 · 10:42"`, lines `"2 × Beef Tibs"` `"1,300 ETB"`, notes,
     `"Total"` `"1,370 ETB"`.
   - Header items 1–2 are the list's `ListHeaderComponent`.
4. **`TabBar`** — My orders active.

## Behaviour

- **Pull to refresh** → refetch (`RefreshControl`, `colors.primary`).
- Cards are not tappable in this slice. (Mark served / paid comes later.)
- Status is shown only by the badge — always label + icon + color.
- Badge labels and icons come from the `StatusBadge` table in `components.md`, keyed by
  `OrderStatus` from `shared/constants.ts`; never compare against string literals.

## States

| State | What shows |
|---|---|
| **Loading (first load)** | Summary strip: 2 `Skeleton` blocks same size as the stat blocks. List: 3 `Skeleton` cards (radius `radius.lg`), each: a `spacing[16]` × `spacing[5]` block (table) + a `spacing[16] + spacing[4]` × `spacing[6]` pill on the right (badge) + two full-width-ish text blocks `spacing[4]` tall. |
| **Loaded** | As above. |
| **Refreshing** | Pull spinner; list stays. |
| **Empty** (no orders today) | No summary strip. `EmptyState`, icon `receipt-outline`: title `"No orders yet today"`, body `"Orders you send to the kitchen show up here."`, button `"Go to tables"` → switch to Tables tab. Pull-to-refresh still works. |
| **Error (first load)** | `EmptyState` error variant: title `"Couldn't load your orders"`, body `"Check your connection and try again."`, button `"Try again"`. |
| **Error on refresh** | Keep old cards; `Banner` `error` above the list: `"Couldn't refresh. Showing the last orders loaded."`, action `"Retry"`. |

## Copy (all strings)

- `"Today"`, `"My orders"`
- `"Orders"`, `"Open"`
- `"Table {number}"`, `"Order #{id} · {time}"`, `"{qty} × {item}"`, `"“{note}”"`,
  `"+{n} more items"`, `"Total"`
- Status labels: `"Sent"`, `"Preparing"`, `"Ready"`, `"Served"`, `"Paid"`;
  a11y `"Status: {label}"`
- `"No orders yet today"`, `"Orders you send to the kitchen show up here."`,
  `"Go to tables"`
- `"Couldn't load your orders"`, `"Check your connection and try again."`, `"Try again"`
- `"Couldn't refresh. Showing the last orders loaded."`, `"Retry"`
