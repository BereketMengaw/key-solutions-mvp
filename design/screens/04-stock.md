# 04 — Stock (owner website)

Route: `/stock`, inside the app frame (`04-web-shell.md`). Manager and owner see the same
page. Landing page this slice.

## Purpose

The owner sees, at a glance, how much of every ingredient is on hand, which ones are low,
and what changed it. When a delivery arrives they add it in a few keystrokes and watch
the alert clear. In the demo this page is open on the laptop while the waiter sends an
order, so **live changes must be visible without being loud**: calm page, numbers first,
red only where something is low.

## Data

- `ingredients`: `id, name, unit, quantity_on_hand, low_stock_threshold`. Sorted by
  `name` A→Z (`localeCompare(…, 'en')`). The order never changes on live updates, so rows
  don't jump while the owner is about to click.
- Recent changes: `stock_movements` with `reason in ('order', 'restock')`, newest first,
  limit 60, joined to the ingredient name/unit, the order's table number
  (`orders.table_id → dining_tables.number`) and the author's `profiles.full_name`.
  Opening stock (`adjustment`) is not listed.
- Realtime (one channel, via the `StockProvider` in the `(app)` layout):
  `ingredients` UPDATE/INSERT → patch the row in place; `stock_movements` INSERT →
  refetch the recent-changes list, **debounced 300 ms** (one order inserts one row per
  ingredient). After any reconnect, refetch both.
- Rules from `components.md` → Formatting helpers: `formatQuantity`, `formatDelta`,
  `formatTime` (Addis time), `isLow` / Out.

## Layout — laptop (≥ `xl`, 1280+), the demo view

```
Stock                                                   (● Live)  [+ Add stock]
16 ingredients · levels drop as orders are sent

┌─ ⚠ Low stock ──────┐ ┌─ ▣ Ingredients ─────┐ ┌─ ◷ Last change ──────────┐
│ 1                  │ │ 16                  │ │ 14:02                    │
│ Beef               │ │ Tracked in kg, L    │ │ Order #12 · Table 4      │
└────────────────────┘ │ and pieces          │ └──────────────────────────┘
                       └─────────────────────┘
┌──────────────────────────────────────────────────────┐ ┌───────────────────────────┐
│ [🔍 Search ingredients        ] [ All 16 | Low (1) ] │ │ Orders and deliveries     │
├──────────────────────────────────────────────────────┤ │ Stock changes, newest…    │
│ Ingredient     On hand   Level          Status       │ ├───────────────────────────┤
│ Avocado        12 kg     ███│██████░░░             [Add]│ (◎) Order #12 · Table 4 14:02│
│ Low below 3 kg                                       │ │ Beef −0.5 kg · Injera −4… │
│▌Beef           4.8 kg    ██▌│░░░░░░░░  [⚠ Low]   [Add]│ ├───────────────────────────┤
│▌Low below 5 kg −0.5 kg                               │ │ (+) Delivery · Beef 14:05 │
│ Berbere        3 kg      ███│█████████             [Add]│ │ +10 kg · by Abebe Kebede  │
│ …                                                    │ └───────────────────────────┘
└──────────────────────────────────────────────────────┘
          1fr                                                 w-side-panel (320)
```

Content width: 1120 at 1440, 976 at 1280 (from the frame).

### 1. Page header

`flex flex-wrap items-end justify-between gap-4` (the shared page header).

- Left: `<h1>` `"Stock"` `text-2xl font-bold`; `mt-1` subtitle
  `"16 ingredients · levels drop as orders are sent"` `text-md text-text-muted`
  (the number is the real count; `"1 ingredient · …"` when 1).
- Right: `flex items-center gap-3`: **LivePill**, then Button `primary` size `md`, icon
  `add`, `"Add stock"` → opens Add stock with no ingredient chosen.

### 2. Stat tiles

`mt-6 grid grid-cols-3 gap-4` (all ≥ `md`). Three StatTiles:

| Tile | Icon | Label | Value | Caption |
|---|---|---|---|---|
| **Low stock** (a `<button>`, toggles the Low filter) | `warning-outline` | `"Low stock"` | count of low ingredients | 0 → `"Everything is above its low level"`; 1 → `"Beef"`; 2 → `"Beef and Onion"`; 3+ → `"Beef, Onion +1 more"` (A→Z) |
| **Ingredients** | `cube-outline` | `"Ingredients"` | `16` | `"Tracked in kg, L and pieces"` |
| **Last change** | `time-outline` | `"Last change"` | `formatTime` of the newest listed change, e.g. `"14:02"` (`"Yesterday 14:02"` is too long for `text-3xl`: use `text-2xl` for anything but `HH:mm`) | the change's title: `"Order #12 · Table 4"` or `"Delivery · Beef"`. None → value `"—"`, caption `"No orders or deliveries yet"` |

- Low stock uses the **alert variant** whenever the count is ≥ 1, the plain variant at 0.
- Low stock tile: `aria-pressed` = Low filter on; `aria-label`
  `"Low stock: 1 ingredient. Show only low stock."` (or `"Show all ingredients."` when
  pressed).

### 3. Ingredients card

`mt-8` then (≥ `xl`) a two-column grid
`grid grid-cols-[minmax(0,1fr)_var(--spacing-side-panel)] gap-6 items-start`. Left
column is this card; right column is §4.

Card: `bg-surface border border-border rounded-xl shadow-sm overflow-hidden`.

**Toolbar** `flex flex-wrap items-center gap-3 p-4 border-b border-border`:

- Search field (`flex-1 min-w-0`), placeholder `"Search ingredients"`,
  `aria-label="Search ingredients"`. Filters by name, case-insensitive, "contains",
  as you type (no debounce needed for 16 rows).
- SegmentedControl, `aria-label="Show"`: `"All"` + count (16), `"Low"` + count (chip
  when ≥ 1). Selecting Low = same as pressing the Low stock tile.
- Search text and filter are kept in the URL (`?q=be&show=low`, `router.replace`, no
  scroll), so a refresh keeps them.

**Table** — a real `<table className="w-full">` (≥ `md`), caption `sr-only`
`"Ingredients and stock levels"`.

| Column | `<th>` text | Cell | Width |
|---|---|---|---|
| Ingredient | `"Ingredient"` | name `text-md font-semibold text-text`; below it `"Low below 5 kg"` `text-sm text-text-subtle` (`formatQuantity` of the threshold) | `w-[30%]` |
| On hand | `"On hand"` (right-aligned) | `formatQuantity` `text-lg font-semibold tabular-nums text-text` (low/out: `text-danger`); below it the **delta slot** `text-sm tabular-nums` (see Live update), always rendered so the row never changes height | `min-w-stock-qty-col whitespace-nowrap text-right` |
| Level | `"Level"` | LevelBar | takes the rest |
| Status | `"Status"` | StatusChip (Low / Out / sr-only "In stock") | `w-px min-w-stock-status-col whitespace-nowrap` |
| — | `sr-only` `"Actions"` | Button `secondary` size `sm`, icon `add`, `"Add"`, `aria-label="Add stock to Beef"` → opens Add stock with that ingredient chosen | `w-px whitespace-nowrap text-right` |

- `<th>`: `px-4 py-3 text-left text-sm font-semibold text-text-muted bg-surface
  border-b border-border`, `scope="col"`.
- `<td>`: `px-4 py-3 align-middle`; rows `border-t border-border` (not the first).
  Row hover: `hover:bg-background` (subtle; rows themselves are not clickable).
- **Low / Out row:** the first cell is `relative` and holds an edge
  `absolute inset-y-0 left-0 w-flag-edge bg-status-low-stock-fg` (`aria-hidden`).
  That edge + red number + red bar fill + chip = colour, text and icon together.
  The row background stays white.
- The Add button is always visible (not hover-only).

**Table footer** (only when filtered): `px-4 py-3 border-t border-border text-sm
text-text-muted`: `"Showing 1 of 16"`.

### 4. Orders and deliveries panel

≥ `xl`: right column, `sticky top-8`, `max-h-[calc(100vh-var(--spacing-16))] flex
flex-col`. Below `xl`: full width, `mt-6`, no max height.

Card `bg-surface border border-border rounded-xl shadow-sm overflow-hidden`.

- Header `px-5 pt-5 pb-4 border-b border-border`: `<h2>` `"Orders and deliveries"`
  `text-lg font-bold`; `"Stock changes, newest first"` `text-sm text-text-muted`.
- List `<ol>` `overflow-y-auto divide-y divide-border`, up to **12 entries**.

**Grouping:** movements with the same `order_id` are **one entry** (a sent order touches
up to 7 ingredients). Each restock is its own entry.

**Entry** `px-5 py-4 flex gap-3`:

- Icon circle `size-10 rounded-full flex-none grid place-items-center`:
  order → `bg-surface-muted`, `receipt-outline size-icon text-text-muted`;
  restock → `bg-success-soft`, `add-circle-outline size-icon text-success`.
- Body `min-w-0 flex-1`:
  - Top row `flex items-baseline gap-2`: title `text-sm font-semibold text-text`, then
    `ml-auto` time `text-xs text-text-subtle tabular-nums whitespace-nowrap`.
  - **Order:** title `"Order #12 · Table 4"`. Detail `mt-1 text-sm text-text-muted`:
    each ingredient as `"Beef −0.5 kg"` (`whitespace-nowrap`), A→Z, joined by
    `" · "`, wrapping freely.
    Example: `Beef −0.5 kg · Coffee beans −0.018 kg · Injera −4 pcs · Milk −0.1 L · Niter kibbeh −0.06 kg · Onion −0.16 kg · Sugar −0.01 kg`.
  - **Restock:** title `"Delivery · Beef"`. Detail `mt-1 text-sm`: `"+10 kg"`
    `font-semibold text-success`, then `text-text-muted` `" · by Abebe Kebede"`
    (omit when there is no name). If `note` is not empty (the column defaults to `''`): `mt-1 text-sm text-text` in curly
    quotes, e.g. `“From the butcher on Bole Road”`, `line-clamp-2`.

**States**

| State | What shows |
|---|---|
| Loading | 3 skeleton entries (circle `size-10` + two lines, `h-4` and `h-4 w-2/3`, `rounded-sm`). |
| Empty | Inside the list area, `px-5 py-10` centred, no hero circle: icon `receipt-outline size-icon-xl text-text-subtle`, `mt-3` `"No orders or deliveries yet"` `text-md font-semibold`, `mt-1` `"When a waiter sends an order or you add stock, it shows here."` `text-sm text-text-muted max-w-text-block`. This is what the demo starts with (0 orders). |
| Error | Banner `error` `"Couldn't load recent changes"` / `"Check your connection."` with a `ghost` `"Retry"`, in the list area `m-5`. The ingredients table stays usable. |
| New entry arrives | Inserted at the top with the row flash (below). Older entries beyond 12 drop off the bottom. |

## Layout — `lg` (1024–1279)

Same as above, but §4 moves **below** the ingredients card (full width). Tiles stay 3
across. Table columns unchanged.

## Layout — `md` (768–1023), tablet

Top bar frame (no sidebar). Header, tiles (3 across), table, panel below. Same table.

## Layout — phone (< `md`, designed at 390)

```
Stock                              (● Live)
16 ingredients · levels drop as…

┌ ⚠ Low stock ─┐ ┌ ▣ Ingredients ┐
│ 1            │ │ 16            │
│ Beef         │ │ Tracked in …  │
└──────────────┘ └───────────────┘
┌ ◷ Last change ───────────────────┐
│ 14:02 · Order #12 · Table 4      │
└──────────────────────────────────┘
[🔍 Search ingredients            ]
[ All 16        |  Low (1)        ]
┌──────────────────────────────────┐
│▌Beef                    [⚠ Low]  │
│▌4.8 kg  −0.5 kg                  │
│▌██▌│░░░░░░░░░░░░░░░░░░░░░░░░     │
│▌Low below 5 kg           [+ Add] │
├──────────────────────────────────┤
│ Berbere                          │
│ …                                │
└──────────────────────────────────┘
Orders and deliveries …
┌──────────────────────────────────┐
│          [ + Add stock ]          │  sticky bottom bar
└──────────────────────────────────┘
```

- Header: title + LivePill on one row (`flex justify-between items-start`), subtitle
  under. The header's **Add stock** button is hidden; instead a **sticky bottom bar**
  `fixed inset-x-0 bottom-0 z-30 bg-surface border-t border-border px-4 pt-3
  pb-[calc(var(--spacing-3)+env(safe-area-inset-bottom))]` holds Button `primary`
  size `lg` full width `"Add stock"`. The page gets `pb-phone-action-bar` so the last
  item isn't hidden; toasts sit above the bar (`bottom-phone-action-bar`).
- Tiles: `grid grid-cols-2 gap-3`; Last change spans both columns
  (`col-span-2`) and puts value and caption on one line: value `text-lg font-bold`,
  then `" · "` and the caption `text-sm text-text-muted` (`"14:02 · Order #12 · Table 4"`).
  Tile padding `p-4`; the other two tiles' values are `text-2xl`.
- Toolbar: not inside the card; Search full width, then `mt-3` SegmentedControl full
  width (each option `flex-1`, `h-12`, options `h-10`).
- Ingredients: `md:hidden` `<ul>` inside a card (`divide-y divide-border`), one
  `<li>` per ingredient, `relative px-4 py-4` (+ the flag edge when low):
  1. Row `flex items-start justify-between gap-3`: name `text-md font-semibold`;
     StatusChip.
  2. `mt-1` row `flex items-baseline gap-2`: quantity `text-xl font-bold tabular-nums`
     (low: `text-danger`), delta slot `text-sm`.
  3. `mt-3` LevelBar (full width).
  4. `mt-2` row `flex items-center justify-between`: `"Low below 5 kg"` `text-sm
     text-text-subtle`; Button `secondary` size `sm` (here `h-12`) icon `add`
     `"Add"` with the same `aria-label`.
- Render both the table (`hidden md:table`) and the list (`md:hidden`) and switch with
  CSS only — no JS width checks (avoids hydration mismatch).
- Panel below the list, `mt-6`.

## States (whole page)

| State | What shows |
|---|---|
| **Loading** (first load, no data) | Header renders (subtitle `"Loading stock…"`, LivePill `Connecting…`, Add stock disabled). Tiles: 3 real tile containers holding skeleton blocks `h-5 w-1/2`, `h-10 w-1/4`, `h-4 w-2/3` (`rounded-sm`). Card: toolbar skeleton (`h-12 rounded-md`) + 8 skeleton rows, each `px-4 py-3` with `h-5 w-1/4` and `h-4 w-1/6` blocks on the left and a `h-level-bar w-1/3 rounded-full` block in the Level column. Panel: its loading state. |
| **Loaded** | As designed. |
| **Load failed** (ingredients fetch) | Header (no subtitle count), tiles hidden, card replaced by EmptyState error in a `bg-surface border border-border rounded-xl py-16` card: `"Can't load stock"`, `"Check your connection and try again."`, Button `secondary` `"Try again"` (refetches, shows loading). Add stock hidden. |
| **No ingredients at all** | EmptyState (`cube-outline`): `"No ingredients yet"`, `"Ingredients and their stock levels will show here."` No button. (Not reachable with seed data.) |
| **Search has no match** | In the card body, `py-12` centred: `"No ingredients match “xyz”"` `text-md font-semibold`, `mt-2` `ghost` button `"Clear search"`. |
| **Low filter, nothing low** | `py-12` centred: `checkmark-circle size-icon-xl text-success`, `mt-3` `"Nothing is low"` `text-md font-semibold`, `mt-1` `"Every ingredient is above its low level."` `text-sm text-text-muted`, `mt-4` `ghost` `"Show all"`. |
| **Low stock present** | Low tile in alert variant with the count and names; rows flagged; Stock nav chip shows the count. Nothing else (no page banner — the tile is the alert). |
| **Connection** | LivePill states as in `03-kitchen.md`. When **Offline**, show `Banner` `error` under the page header: `"Connection lost"` / `"Stock levels won't update until it's back. Trying again…"`, action `"Retry now"`. On recovery, refetch everything, then a `success` Banner `"Back online. Stock is up to date."` for `timing.backOnlineMs`. Rows keep showing the last known numbers. |

## Live update arrival (an order was sent, or someone else added stock)

When a realtime `ingredients` update changes a row's `quantity_on_hand` from the value
on screen (ignore updates that don't change it — e.g. the echo of our own Add stock
after we already applied it):

1. **Number** switches to the new value immediately.
2. **Delta slot** shows the change since the delta appeared: `formatDelta`, decrease
   `text-text-muted`, increase `text-success font-semibold`. It stays for
   `timing.deltaShowMs` (6 s), then fades out (`transition-opacity duration-300`).
   A second change while it shows **adds up** and restarts the timer
   (−0.5 then −0.25 → `"−0.75 kg"`).
3. **Row flash:** the row (`<tr>` / `<li>`) gets `bg-primary-soft` at once, holds for
   `timing.rowFlashHoldMs`, then returns to its normal background with
   `transition-colors duration-1500` (`timing.rowFlashFadeMs`). The flag edge, chip and
   bar stay readable on `primary-soft` (checked: tick 3.28, danger 6.56, subtle text 4.97).
4. **Bar** animates to the new width (`timing.levelBarMs`) and turns red if low.
5. **Crossing into low:** StatusChip appears, number and fill turn red, flag edge
   appears, the Low tile switches to alert variant and its value/caption update, the
   Stock nav chip appears or increments. The Low tile gets the same flash as the row
   (`bg-primary-soft` is not used here — flash it with `ring-2
   ring-status-low-stock-fg` for the hold time, then remove).
6. **Crossing back above:** the reverse; the chip and edge disappear without
   animation.
7. **Screen readers:** one `sr-only` `aria-live="polite"` region on the page announces
   only crossings: `"Beef is low: 4.8 kg left."` / `"Beef is back above its low level:
   14.8 kg."` Ordinary changes are not announced (they would be constant).
8. If the row is hidden by the search or filter, nothing extra is shown — except that a
   row which becomes low while the Low filter is on **appears** (with the flash), and a
   row that stops being low while the Low filter is on stays visible until the filter
   or search changes (so it doesn't vanish under the cursor).
9. If Add stock is open for that ingredient, its "On hand now" figure updates too.

`prefers-reduced-motion`: no fades or bar animation; the flash is still applied and
removed (colour only), the delta still shows for 6 s.

## Add stock (drawer)

Opened by the header button / phone bottom bar (no ingredient chosen) or a row's **Add**
(that ingredient chosen). Drawer component: right side `w-drawer` (≥ `md`), full screen
below. `aria-labelledby` the title.

```
┌──────────────────────────────────────┐
│ Add stock                         ✕  │
│ Record a delivery. Stock goes up     │
│ straight away.                       │
├──────────────────────────────────────┤
│ Ingredient                           │
│ [ Beef (4.8 kg) · Low            ▾ ] │
│                                      │
│ Amount to add                        │
│ [ 10                          kg ]   │
│ How much arrived, in kg.             │
│                                      │
│ Note (optional)                      │
│ [ e.g. Delivery from the butcher   ] │
│                                      │
│ ┌──────────────────────────────────┐ │
│ │ On hand now        After         │ │
│ │ 4.8 kg      →      14.8 kg       │ │
│ │ ✓ Back above the low level (5 kg)│ │
│ └──────────────────────────────────┘ │
├──────────────────────────────────────┤
│              [ Cancel ] [ Add 10 kg ]│
└──────────────────────────────────────┘
```

### Header

- Title `"Add stock"`; subtitle `"Record a delivery. Stock goes up straight away."`
- Close button (`aria-label="Close"`).

### Form (`<form noValidate>`, body `flex flex-col gap-5`)

1. **Ingredient** — native Select, label `"Ingredient"`.
   - First option (only when nothing is chosen): `"Choose an ingredient"`, `value=""`,
     `disabled`.
   - Options A→Z: `"Beef (4.8 kg)"`; low ones `"Beef (4.8 kg) · Low"`. Live values.
2. **Amount to add** — TextField with unit suffix.
   - `type="text" inputMode="decimal" autoComplete="off"`, placeholder `"0"`.
   - Suffix = the chosen unit (`kg` / `L` / `pcs`); none when nothing chosen.
   - Helper: `"How much arrived, in kg."` / `"…, in litres."` / `"…, in pieces."`;
     nothing chosen → `"Choose an ingredient first."`.
   - Accept `,` as the decimal mark (`"2,5"` → 2.5). Trim spaces.
3. **Note (optional)** — TextField, label `"Note (optional)"`, placeholder
   `"e.g. Delivery from the butcher"`, `maxLength={120}`. A single-line input (Enter
   submits). Show a counter `"87 / 120"` `text-xs text-text-subtle text-right` once 100+
   characters are typed.
4. **Preview** (shown once an ingredient is chosen) `rounded-lg bg-surface-muted p-4`:
   - Two columns `grid grid-cols-[1fr_auto_1fr] items-end gap-3`:
     `"On hand now"` `text-xs font-semibold text-text-muted` over
     `formatQuantity` `text-xl font-bold tabular-nums` (red if low); an arrow `→`
     `text-text-subtle` (`aria-hidden`); `"After"` over the new total `text-xl
     font-bold tabular-nums text-text`. Without a valid amount, "After" shows `"—"`.
   - Line under (`mt-3 flex gap-2 text-sm`), by case:
     - was low, after is no longer low (at or above the threshold) → `checkmark-circle size-icon-sm
       text-success` + `"Back above the low level (5 kg)"` `text-success font-semibold`;
     - after is still low → `warning-outline text-status-low-stock-fg` +
       `"Still below the low level (5 kg)"` `text-status-low-stock-fg`;
     - otherwise → `"Low level: 5 kg"` `text-text-muted`, no icon.
   - The preview is `aria-live="polite"` so the "After" figure is read as you type.

### Footer

`secondary` `"Cancel"` and `primary` submit (size `md`). Submit label:
`"Add stock"` until the amount is a valid number, then `"Add 10 kg"`
(`formatQuantity` of the amount). Never disabled — validate on submit.

### Keyboard and focus

- On open: focus **Amount** if an ingredient was chosen (the row's Add), else
  **Ingredient**.
- Tab order: Close → Ingredient → Amount → Note → Cancel → Add (DOM order; the close
  button is first in DOM but doesn't get initial focus).
- **Enter** in Amount or Note submits. Esc closes (native `cancel` event) — except while
  submitting (`preventDefault`).
- Changing the ingredient keeps the typed amount and re-validates only if an error was
  showing (pcs needs a whole number).
- On validation failure: focus the first invalid field.
- On close (any way): focus returns to the button that opened it. If that was a row's
  Add and the row is now filtered out, focus the header Add stock button.
- The form resets every time the drawer opens.

### Validation (on submit, client side)

| Case | Field | Message |
|---|---|---|
| No ingredient | Ingredient | `"Choose an ingredient."` |
| Empty amount | Amount | `"Enter an amount."` |
| Not a number | Amount | `"Enter a number, like 10 or 2.5."` |
| ≤ 0 | Amount | `"Enter an amount above 0."` |
| `pcs` and not whole | Amount | `"Injera is counted in pieces. Enter a whole number."` (ingredient name inserted) |
| More than 3 decimals (`kg`/`L`) | Amount | `"Use at most 3 decimal places."` |
| Over 1,000 (`kg`/`L`) or 10,000 (`pcs`) | Amount | `"That's more than 1,000 kg in one delivery. Check the amount."` (limit and unit inserted) |

### Submitting / success / failure

| State | What shows |
|---|---|
| **Submitting** | Submit button loading `"Adding…"`; all fields, Cancel and Close disabled; Esc and backdrop click ignored. Calls `add_stock(p_ingredient_id, p_quantity, p_note)` (note `null` when empty, trimmed otherwise). |
| **Success** | Apply the new quantity to the row at once (`add_stock` returns the new `quantity_on_hand`; the realtime echo then matches and is ignored). Close the drawer, focus back to the opener. The row does the live-update arrival (delta `"+10 kg"` in green, flash, bar grows, chip clears). Toast: title `"Added 10 kg of Beef"`; body `"Beef is back above its low level."` if it crossed, else `"Beef now has 14.8 kg."` The new restock appears at the top of Orders and deliveries. |
| **Not allowed** (permission error, `42501`) | Drawer stays open, Banner `error` at the top of the body: `"You can't add stock"` / `"Only managers and owners can add stock. Sign in with one of those accounts."` |
| **Rejected amount** (server check, `22023` / `23514`) | Amount field error `"Enter an amount above 0."` |
| **Network / timeout (15 s)** | Banner `"Can't reach the server"` / `"Nothing was added. Your entry is kept — try again."` Fields kept, focus stays on the submit button. |
| **Anything else** | Banner `"Couldn't add stock"` / `"Something went wrong. Try again."` |

The banner clears when any field is edited. Never show raw Supabase text.

## Demo walk-through (what the "Done when" steps look like)

1. Open `/stock` after reset: 16 rows A→Z, Low stock tile **0** "Everything is above its
   low level", Beef `5.3 kg`, bar just right of the tick, no chip. Orders and deliveries
   is empty. LivePill **Live**.
2. Waiter sends 2 Beef Tibs + 1 Macchiato: within ~1 s the Beef row flashes, shows
   `4.8 kg` in red with `−0.5 kg`, bar slips left of the tick and turns red, **Low** chip
   + edge appear; Low tile turns red **1** "Beef"; Stock nav chip **1**. Onion, Injera,
   Niter kibbeh, Coffee beans, Milk and Sugar rows flash with their deltas. The panel
   shows "Order #12 · Table 4" with the deductions.
3. Owner clicks Beef's **Add** → drawer, Amount focused, types `10`, preview
   "4.8 kg → 14.8 kg ✓ Back above the low level (5 kg)", presses Enter → drawer closes,
   Beef `14.8 kg` with `+10 kg`, chip gone, Low tile **0**, toast "Added 10 kg of Beef",
   panel shows "Delivery · Beef +10 kg · by Abebe Kebede" above the order.

## Copy (all strings, exact)

- `"Stock"`, `"16 ingredients · levels drop as orders are sent"` (`"1 ingredient · …"`),
  `"Loading stock…"`
- `"Add stock"`, `"Add"`, `"Add stock to Beef"`
- Tiles: `"Low stock"`, `"Everything is above its low level"`, `"Beef and Onion"`
  pattern `"{a} and {b}"`, `"{a}, {b} +{n} more"`; `"Ingredients"`,
  `"Tracked in kg, L and pieces"`; `"Last change"`, `"No orders or deliveries yet"`, `"—"`
- Tile a11y: `"Low stock: {n} ingredient(s). Show only low stock."`, `"… Show all ingredients."`
- `"Search ingredients"`, `"Clear search"`, `"Show"`, `"All"`, `"Low"`, `"Showing {n} of {total}"`
- Table: `"Ingredients and stock levels"`, `"Ingredient"`, `"On hand"`, `"Level"`,
  `"Status"`, `"Actions"`, `"Low below {qty}"`, `"In stock"`, chip `"Low"`, `"Out"`
- `"No ingredients match “{q}”"`, `"Nothing is low"`, `"Every ingredient is above its low level."`, `"Show all"`
- `"Can't load stock"`, `"Check your connection and try again."`, `"Try again"`,
  `"No ingredients yet"`, `"Ingredients and their stock levels will show here."`
- Panel: `"Orders and deliveries"`, `"Stock changes, newest first"`,
  `"Order #{id} · Table {n}"`, `"Delivery · {ingredient}"`, `"by {name}"`,
  `"No orders or deliveries yet"`,
  `"When a waiter sends an order or you add stock, it shows here."`,
  `"Couldn't load recent changes"`, `"Check your connection."`, `"Retry"`
- Connection: `"Connecting…"`, `"Live"`, `"Reconnecting…"`, `"Offline"`,
  `"Connection lost"`, `"Stock levels won't update until it's back. Trying again…"`,
  `"Retry now"`, `"Back online. Stock is up to date."`
- Live announcements: `"{name} is low: {qty} left."`, `"{name} is back above its low level: {qty}."`
- Drawer: `"Add stock"`, `"Record a delivery. Stock goes up straight away."`, `"Close"`,
  `"Ingredient"`, `"Choose an ingredient"`, `"{name} ({qty})"`, `"{name} ({qty}) · Low"`,
  `"Amount to add"`, `"How much arrived, in kg."` / `"in litres."` / `"in pieces."`,
  `"Choose an ingredient first."`, `"Note (optional)"`, `"e.g. Delivery from the butcher"`,
  `"{n} / 120"`, `"On hand now"`, `"After"`, `"Back above the low level ({qty})"`,
  `"Still below the low level ({qty})"`, `"Low level: {qty}"`,
  `"Cancel"`, `"Add {qty}"`, `"Adding…"`
- Validation: `"Choose an ingredient."`, `"Enter an amount."`,
  `"Enter a number, like 10 or 2.5."`, `"Enter an amount above 0."`,
  `"{name} is counted in pieces. Enter a whole number."`,
  `"Use at most 3 decimal places."`,
  `"That's more than {limit} in one delivery. Check the amount."`
- Results: `"Added {qty} of {name}"`, `"{name} is back above its low level."`,
  `"{name} now has {qty}."`, `"You can't add stock"`,
  `"Only managers and owners can add stock. Sign in with one of those accounts."`,
  `"Can't reach the server"`, `"Nothing was added. Your entry is kept — try again."`,
  `"Couldn't add stock"`, `"Something went wrong. Try again."`, `"Dismiss"`
