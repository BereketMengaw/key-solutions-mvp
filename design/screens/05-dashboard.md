# 05 — Dashboard (owner website)

Route: `/dashboard`, inside the app frame (`04-web-shell.md`). Manager and owner see the
same page. **From this slice it is the landing page** (replaces the "Coming next"
placeholder). `/menu` stays the placeholder.

## Purpose

In five seconds the owner knows how the day is going: money in, how many orders, what is
selling, what is happening on the floor right now, and what is running out. During the demo
this page is open on the laptop while the waiter and cook use the app, so **every change
lands live, visibly but calmly**: numbers tick up, a row flashes, a bar grows. Red is used
only for things that need action (low stock, a Late order).

Rules that hold everywhere on this page:

- **Today only.** "Today" = since 00:00 Africa/Addis_Ababa. No yesterday, no last week, no
  "vs" anything, no trend arrows, no targets. Every caption is a fact about today.
- **Money = paid orders only.** Sales today, average order, sales by hour and payment mix
  count **paid** orders (`status = paid`, by `paid_at`).
  **One exception, by decision: Top items** counts **every order sent today, paid or not**
  (so it fills the moment a waiter sends), and its ETB figure is **order value**, not paid
  sales — its subtitle says so. Unpaid orders also show in **Orders today**, **Open
  orders** and **Live floor**.
- **Money format** is the same as everywhere else: `formatEtb` → `"1,370 ETB"` (whole
  amounts, `,` thousands, a space, `ETB` after). Averages are rounded to the whole birr.
  Compact `"1K"` / `"2.5K"` is used **only** on the chart's y-axis ticks.
- **Times** are Addis Ababa time, 24-hour `HH:mm` (`formatTime` from `web/src/lib/format.ts`).
- Charts are plain HTML/CSS (flex columns and divs, no SVG needed, **no chart library**).

Tokens marked **(new)** were added to `design/tokens.ts` in this slice (listed under
"Tokens added" at the end).

---

## Data the page needs (request to `backend`)

One call, `dashboard_today()` (manager/owner only, today in Addis time), returning JSON.
Its shape is `shared/dashboard.ts` (`DashboardToday`); the design uses only fields that
exist there. Backend's `live_floor` = the open-order rows below; backend's `open_orders`
is their count. Backend's `low_stock` may be used for Stock alerts instead of
`StockProvider` — same rule. There is no first-order time and no per-hour order count, so
the design doesn't use either.

| Field | Meaning | Used by |
|---|---|---|
| `sales_etb` | Sum of `quantity × unit_price_etb` over today's paid orders | Sales today |
| `paid_orders` | Count of orders paid today | Sales today caption, Average order |
| `orders_today` | Count of orders **created** today, any status | Orders today, fresh-day switch |
| `sales_by_hour` | `[{ hour: 0–23, sales_etb }]`, Addis hour of `paid_at` (backend sends all 24; hours with `sales_etb > 0` count as "with sales") | Sales by hour |
| `top_items` | Top 5 by quantity over **every order sent today, any status**: `[{ menu_item_id, name, quantity, revenue_etb }]` (`revenue_etb` = order value), quantity desc, then revenue desc, then name A→Z | Top items |
| `payment_mix` | `[{ method, sales_etb, orders }]` for paid orders, one row per method that has sales | Payment mix |
| `live_floor` | Orders with status `sent`/`preparing`/`ready`/`served` (any day — an order left open from yesterday is still on the floor): `[{ id, table_number, status, created_at, item_count, waiter_name }]`, oldest first. `item_count` counts units (2 Beef Tibs + 1 Macchiato = 3) | Open orders tile, Live floor |

Stock alerts read the existing `StockProvider` (`useStock()`): `ingredients`, `isLow`,
`isOut`. No new stock query.

**Refresh:** Realtime events on `orders` and `order_items` → refetch `dashboard_today()`,
debounced 300 ms, sequence-guarded (an older response never overwrites a newer one).
Refetch on every `SUBSCRIBED` (first time and after reconnect). Also refetch when the Addis
date changes (checked on each `timing.timerTickMs` tick), so the page rolls over to a fresh
day at midnight by itself.

---

## Layout — laptop (≥ `xl`, 1280+), the demo view

Content width is 1120 at 1440 and 976 at 1280 (from the frame). Same structure at both;
only the column widths change.

```
Dashboard                                                          (● Live)
Today · Sunday 18 October

┌ ◎ Sales today ──┐ ┌ ▣ Orders today ─┐ ┌ ◇ Average order ┐ ┌ ⌂ Open orders ──┐
│ 1,370 ETB       │ │ 1               │ │ 1,370 ETB       │ │ 0               │
│ +1,370 ETB      │ │                 │ │                 │ │                 │
│ From 1 paid     │ │ 1 paid · 0 open │ │ Per paid order  │ │ Nothing waiting │
│ order           │ │                 │ │                 │ │ on the floor    │
└─────────────────┘ └─────────────────┘ └─────────────────┘ └─────────────────┘

┌ Sales by hour ───────────────────────────────────┐ ┌ Live floor ─────────────────┐
│ Paid sales per hour, Addis Ababa time  Busiest…  │ │ Open orders by status,      │
│  2K ┼────────────────────────────────────────    │ │ oldest first                │
│     │                                            │ ├─────────────────────────────┤
│  1K ┼──────────────────────── 1,370 ─────────    │ │ [✈ Sent]                  1 │
│     │                         ▇▇  ░░             │ │ Table 4              4 min  │
│   0 ┴──▁──▃──▅──▂──▆──▇──▄──▇▇──░░──  ──  ──     │ │ #12 · 3 items · Hana Tesfaye│
│      06:00  08:00  10:00  12:00  14:00 Now 18:00 │ ├─────────────────────────────┤
└──────────────────────────────────────────────────┘ │ [🔥 Preparing]            0 │
┌ Top items today ─────────┐ ┌ Payment mix ────────┐ │ [✓ Ready]                 0 │
│ 1 Beef Tibs  ×2 1,300 ETB│ │ ███████████▌██▌███  │ │ [🍽 Served]               0 │
│   ██████████████████     │ │ ■ Cash      0 ETB 0%│ └─────────────────────────────┘
│ 2 Macchiato  ×1    70 ETB│ │ ■ Telebirr 1,370 …  │ ┌ ⚠ Stock alerts  Open stock →┐
│   █████████              │ │ ■ CBE Birr  0 ETB 0%│ │▌Beef         [⚠ Low]        │
└──────────────────────────┘ └─────────────────────┘ │▌4.8 kg left · low below 5 kg│
                                                     └─────────────────────────────┘
        left column: minmax(0, 1fr)                      right column: w-side-panel (320)
```

At 1440 the left column is 776 wide (Top items and Payment mix ≈ 376 each); at 1280 it is
632 (≈ 304 each). Both fit every element below without wrapping numbers.

### Page structure (DOM order) and grid

DOM order is: header → banner slot → tiles (or fresh-day hero) → **right group** (Live
floor, Stock alerts) → **left group** (Sales by hour, Top items, Payment mix). "What's
happening now" comes first for screen readers and on narrow screens; on laptop the grid
places the groups side by side.

- Body below the tiles: `mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_var(--spacing-side-panel)] xl:items-start`.
- Right group: `flex flex-col gap-6 xl:col-start-2 xl:row-start-1`.
  Below `xl` and ≥ `md`: `md:grid md:grid-cols-2 md:items-start md:gap-6` (Live floor |
  Stock alerts side by side); at `xl` it goes back to `xl:flex xl:flex-col`.
- Left group: `flex flex-col gap-6 xl:col-start-1 xl:row-start-1`. Inside it, Top items and
  Payment mix sit in `grid gap-6 md:grid-cols-2`.

Every card: `bg-surface border border-border rounded-xl shadow-sm`. Card header (all
cards): `px-5 pt-5 pb-4`, `<h2>` `text-lg font-bold text-text`, subtitle `mt-1 text-sm
text-text-muted`. Card body padding is per section below.

### 1. Page header

The shared `PageHeader`:

- `<h1>` `"Dashboard"`.
- Subtitle: `"Today · Sunday 18 October"` — `Intl.DateTimeFormat('en-GB', { weekday:
  'long', day: 'numeric', month: 'long', timeZone: 'Africa/Addis_Ababa' })`, prefixed
  with `"Today · "`. Rendered on the server too (it's the Addis date, not the browser's).
- Actions (right): **LivePill** for the dashboard's Realtime channel. No buttons.

Banner slot under the header: `mt-4`, only when there is a banner (connection, refresh
error — see States).

### 2. Today's numbers (tiles)

`mt-6 grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-4`. Four `StatTile`s (existing
component), plain variant, not buttons. Value row is `flex items-baseline flex-wrap gap-x-1`.

| # | Icon | Label | Value | Caption |
|---|---|---|---|---|
| 1 | `cash-outline` (new icon) | `"Sales today"` | number `"1,370"` + unit `"ETB"` | 0 paid → `"No paid orders yet"`; 1 → `"From 1 paid order"`; n → `"From 25 paid orders"` |
| 2 | `receipt-outline` | `"Orders today"` | `"1"` | `"{paid} paid · {open} open"` → `"1 paid · 0 open"` (`paid_orders` · `open_orders`; open includes orders left from earlier days, so the two need not add up to the value) |
| 3 | `pricetag-outline` (new icon) | `"Average order"` | `round(sales_etb / paid_orders)` → `"548"` + `"ETB"`; 0 paid → `"—"` | paid ≥ 1 → `"Per paid order"`; 0 paid → `"Shows after the first payment"` |
| 4 | `restaurant-outline` | `"Open orders"` | `open_orders` (count) → `"3"` | 0 → `"Nothing waiting on the floor"`; ≥ 1 → `"Oldest: Table 4 · 12 min"` (the oldest open order, wait as in Live floor, re-rendered every `timing.timerTickMs`) |

- **Money values** split number and unit: number `text-3xl font-bold text-text
  tabular-nums`; unit `text-lg font-semibold text-text-muted` (`ml-1`). The unit is part of
  the same text node for screen readers (`"1,370 ETB"`). At 1280 the tile's inner width is
  192; `"22,480 ETB"` measures ≈ 172 at these sizes, so it fits on one line. If it ever
  doesn't, the unit wraps under the number (`flex-wrap`), never truncates.
- `"—"` (Average with no payments) is `text-3xl font-bold text-text-subtle`.
- **Late oldest order:** when the oldest open order is `sent` or `preparing` and ≥
  `timing.overdueAfterMinutes`, the Open orders caption becomes `text-danger
  font-semibold` with a leading `alert-circle size-icon-sm` and reads
  `"Oldest: Table 4 · 12 min · Late"`. Colour + icon + the word.
- **Delta slot** (tiles 1 and 2 only — the two that only go up during a day): a line under
  the value, `text-sm font-semibold tabular-nums text-success`, always rendered (empty
  when there is nothing to show) so the tile never changes height. See "Live arrival".
- Tiles use `tabular-nums` on values (deliberate, matching the Stock tiles): the values
  count up live, and proportional digits would jitter while they do.
- Tile `aria-label` reads the whole tile: `"Sales today: 1,370 ETB, from 1 paid order"`.

### 3. Live floor (right group, first card)

Header: `<h2>` `"Live floor"`; subtitle `"Open orders by status, oldest first"`. Header
gets `border-b border-border`.

**Groups** — always all four, in pipeline order, each a `<section aria-labelledby>`,
groups separated by `border-t border-border` (not before the first):

| Status (`ORDER_STATUSES`) | Chip label | Icon |
|---|---|---|
| `sent` | `"Sent"` | `paper-plane-outline` (new icon) |
| `preparing` | `"Preparing"` | `flame-outline` |
| `ready` | `"Ready"` | `checkmark-circle-outline` (new icon) |
| `served` | `"Served"` | `restaurant-outline` |

The owner sees the waiter's words ("Sent", not the kitchen's "New").

- Group header `flex items-center justify-between px-5 pt-4 pb-2`:
  - **Order status chip** (web StatusBadge): `inline-flex items-center gap-1 py-1 px-3
    rounded-full text-sm font-semibold bg-status-{status}-bg text-status-{status}-fg`,
    icon `size-icon-sm`. Same colours as the app.
  - Count `text-sm font-semibold tabular-nums` — `text-text` when ≥ 1, `text-text-subtle`
    when 0. sr-only suffix `" open"`.
- Rows `<ul>` (`divide-y divide-border`), oldest first; the group has `pb-2` after its
  last row. A group with 0 orders is just its header.
- **Row** `px-5 py-3 flex items-start gap-3`:
  - Left `min-w-0 flex-1`: `"Table 4"` `text-md font-semibold text-text`; under it
    `"#12 · 3 items · Hana Tesfaye"` `text-sm text-text-muted` (wraps freely; omit the
    name part when null; `"1 item"` singular).
  - Right `flex-none`: the **wait**, time since the order was **sent** (`created_at`), same
    rule and words as the kitchen ticket timer (`03-kitchen.md`): `"Just now"`,
    `"4 min"`, `"1 h 5 min"`. Shown as `inline-flex items-center gap-1 text-sm
    tabular-nums text-text-muted whitespace-nowrap` with `time-outline size-icon-sm`.
  - **Late** (status `sent` or `preparing` only, wait ≥ `timing.overdueAfterMinutes`):
    the wait becomes a solid chip `inline-flex items-center gap-1 py-1 px-3 rounded-full
    text-sm font-semibold bg-overdue text-text-on-overdue` with `alert-circle
    size-icon-sm`: `"12 min · Late"` (7.50:1). Ready and Served never show Late (the
    kitchen is done; the clock is shown for information).
  - One `timing.timerTickMs` interval drives every wait on the page (floor rows and the
    Open orders caption). Negative minutes (clock skew) count as 0.
  - Row `aria-label`: `"Table 4, order 12, 3 items, Hana Tesfaye, sent 4 minutes ago"`
    (+ `", late"`).
- Rows are not clickable.

**Floor empty** (no open orders): instead of the four groups, a block `px-5 py-8 text-center`:
`restaurant-outline size-icon-xl text-text-subtle` (centred), `mt-3` `"No open orders"`
`text-md font-semibold text-text`, `mt-1` `"New orders appear here the moment a waiter
sends them."` `text-sm text-text-muted max-w-text-block mx-auto`.

No max height and no inner scroll: 8 tables keep the list short.

### 4. Stock alerts (right group, second card)

Header row `flex items-start justify-between gap-3` (`px-5 pt-5 pb-4 border-b
border-border`):

- Left: `<h2>` `"Stock alerts"` with a leading `warning-outline size-icon
  text-status-low-stock-fg` **only when ≥ 1 item is low** (`flex items-center gap-2`);
  subtitle `"Ingredients below their low level"`.
- Right: link `"Open stock"` → `/stock`, `inline-flex items-center gap-1 h-10 px-2
  -mr-2 rounded-md text-sm font-semibold text-primary hover:bg-primary-soft`, trailing
  `arrow-forward-outline size-icon-sm` (new icon).

**Rows** (`<ul>`, `divide-y divide-border`), up to **5** (`dashboard.stockAlertRows`, new):
Out first, then by `quantity / threshold` ascending (most urgent first), then name A→Z.

- Each row is a link (`<a>` filling the `<li>`) to `/stock?q={name}` (the Stock page
  already reads `?q=`), `relative flex items-center gap-3 px-5 py-3 hover:bg-background`:
  - Flag edge `absolute inset-y-0 left-0 w-flag-edge bg-status-low-stock-fg`
    (`aria-hidden`), as on the Stock table.
  - Middle `min-w-0 flex-1`: name `text-md font-semibold text-text`; under it
    `"4.8 kg left · low below 5 kg"` `text-sm text-text-muted` (`formatQuantity` for both;
    Out → `"None left · low below 5 kg"`).
  - Right: existing **StatusChip** (`Low` / `Out`).
  - `aria-label`: `"Beef: 4.8 kg left, low. Open in Stock."`
- More than 5 low: footer `px-5 py-3 border-t border-border`, link `"See all 7 low
  ingredients"` → `/stock?show=low`, `text-sm font-semibold text-primary`.

**Nothing low:** block `px-5 py-6 flex items-center gap-3`: `checkmark-circle size-icon-lg
text-success`, then a column: `"All stock is above its low level"` `text-md
font-semibold text-text`, `"Nothing needs restocking right now."` `text-sm
text-text-muted`. (At seed, Beef is 5.3 kg vs 5 → this is the fresh-morning view.)

**Loading** (StockProvider not ready): 2 skeleton rows (`h-5 w-1/3`, `h-4 w-1/2`).
**Error** (StockProvider `ingredientsState === 'error'`): Banner `error` `m-5`
`"Couldn't load stock"` / `"Check your connection."` with `ghost` `"Retry"` →
`retryIngredients()`.

### 5. Sales by hour (left group, first card)

Header `flex flex-wrap items-start justify-between gap-x-4 gap-y-1`:

- Left: `<h2>` `"Sales by hour"`; subtitle `"Paid sales per hour, Addis Ababa time"`.
- Right (only when **2 or more** hours have sales): `"Busiest: 13:00 · 4,120 ETB"`
  `text-sm text-text-muted tabular-nums` (`"Busiest:"` in `font-semibold text-text`). Ties
  → the later hour.

Body `px-5 pb-5`.

**Which hours are shown.** One slot per Addis hour from `dashboard.dayStartHour` (06,
new) to `dashboard.dayEndHour` (22, new, exclusive) → 16 slots, 06:00–21:59. The window
**stretches** to include the current hour and every hour that has sales (e.g. a demo run
at 22:40 shows 06–22, 17 slots; at 01:30 it shows 00–21, 22 slots). It never shrinks below
06–21, so the axis stays put all day and the empty future hours show where the day is
going. Hours after now are empty slots (no bar, no "0").

**Geometry** (CSS only):

```
 y-axis gutter w-10      plot: h-chart-plot (200; below md h-chart-plot-sm 160)
┌────┬───────────────────────────────────────────────────────────────┐
│ 2K │ ───────────────────────────────────────────────── gridline    │
│    │                                                               │
│ 1K │ ──────────────────────────── 1,370 ────────────── gridline    │
│    │                             ┌──┐ ░░░                          │
│    │       ┌──┐            ┌──┐  │  │ ░░░ ← Now band (current hour)│
│  0 │ ──────┴──┴────────────┴──┴──┴──┴─░░░──── baseline             │
└────┴───────────────────────────────────────────────────────────────┘
       06:00        08:00        10:00     Now      ← x labels, h-6, text-xs
```

- Wrapper `flex`; y-axis gutter `w-10 flex-none relative`; plot `relative flex-1
  h-chart-plot-sm md:h-chart-plot`. Under the plot an
  x-axis row `relative h-6 mt-2 ml-10` (labels). The card's height includes the label row
  — nothing inside scrolls.
- **Scale.** `max` = the smallest of `[1000, 1500, 2000, 2500, 3000, 4000, 5000, 6000,
  8000, 10000, 15000, 20000, …]` (then ×10) that is ≥ `peak × 1.15` and ≥
  `dashboard.axisMinEtb` (1,000, new). Ticks at 0, ½·max and max (3 lines). The 15 %
  headroom keeps the peak's value label inside the plot. The 1,000 floor stops one
  Macchiato (70 ETB) from filling the chart.
- **Gridlines:** `absolute inset-x-0 border-t border-border` at each tick (½ and max);
  **baseline** at 0: `border-t border-border-strong`. Solid hairlines, never dashed.
- **Y ticks:** `absolute right-2 -translate-y-1/2 text-xs text-text-subtle tabular-nums`,
  compact: `0`, `500`, `1K`, `1.5K`, `2K`, `2.5K`, `10K` (one decimal max, drop `.0`).
- **Slots:** plot children `flex h-full items-end`; each slot `relative flex-1 h-full flex
  items-end justify-center`. The whole slot (full height) is the hover target.
- **Bar:** `w-3/5 max-w-hour-bar rounded-t-bar bg-chart-bar` (square at the baseline,
  4 px round top), `style={{ height: pct + '%' }}`, `pct = sales / max × 100`, at least
  `1.5` for any hour with sales so a 35 ETB tea is visible. `transition-[height,background-color]
  duration-400` (`timing.levelBarMs`), `motion-reduce:transition-none`. No 0-height
  bars are drawn for hours without sales.
- **Now band:** the current hour's slot gets `bg-surface-muted rounded-t-md` behind its
  bar (decorative). Its x label reads `"Now"` in `text-xs font-semibold text-text`.
- **X labels:** `absolute -translate-x-1/2 text-xs text-text-subtle tabular-nums`,
  centred under the slot: every **2nd** hour on even hours (`"06:00"`, `"08:00"`, …) at
  `md`+, every **3rd** hour (`"06:00"`, `"09:00"`, `"12:00"`, …) below `md`. When the
  window has more than 18 slots, use every 3rd at all widths. The `"Now"` label replaces
  its hour's label and **hides the label of each neighbouring slot** so they can't touch.
- **Peak label:** the single highest bar (ties → later hour) carries its value above the
  bar top, `absolute bottom-full mb-1 text-xs font-semibold text-text tabular-nums
  whitespace-nowrap`, number only (`"1,370"`, no ETB — the subtitle and tooltip say ETB).
  No other bar has a label.
- **Hover / focus (tooltip):** pointer over a slot that has sales → its bar turns
  `bg-chart-bar-active` and a **Tooltip** shows above the bar:
  value `"2,340 ETB"` `text-sm font-semibold text-text tabular-nums`, then
  `"14:00–15:00"` `text-xs text-text-muted`. Empty
  slots show nothing. The tooltip is clamped inside the card (flip to left/right-aligned
  at the edges).
- **Keyboard:** the plot is one tab stop: `tabIndex={0}`, `role="group"`,
  `aria-label="Sales by hour. Use the left and right arrow keys to read each hour."`.
  Arrow keys move an active hour across hours that have sales (start at the peak); the
  active bar and tooltip show exactly as on hover. Esc or blur hides it. Focus ring =
  the global one (on the plot box).
- **Table twin:** right after the plot, an `sr-only` `<table>` with caption `"Paid sales
  by hour"`, columns `"Hour"`, `"Sales"`, one row per hour **with sales**
  (`"14:00–15:00"`, `"2,340 ETB"`). The visual chart is `aria-hidden` except the
  focusable group.

**No paid sales yet** (paid_orders = 0, whatever the time): the plot still draws the
baseline, the x labels and the Now band (so it reads as "a day about to fill", not as
broken). No gridlines, no y ticks. Centred over the plot (`absolute inset-0 grid
place-items-center text-center px-6`): `"No sales yet today"` `text-md font-semibold
text-text`, `mt-1` `"Each hour's paid sales show here as a bar."` `text-sm
text-text-muted`. Not focusable; the sr-only table is omitted.

### 6. Top items today (left group, second row, left)

Header: `<h2>` `"Top items today"`; subtitle `"Most ordered today, paid or not · ETB is
order value"`. Counts every order sent today (any status), so it fills on Send, before
payment. The ETB per row is what was ordered (`quantity × unit price`), not money
received — that's why it can be larger than Sales today.

List `<ol>` `px-5 pb-5 flex flex-col gap-4`, up to **5** (`dashboard.topItems`, new) —
fewer if fewer were ordered, never placeholders.

Row:

```
1  Beef Tibs                  ×2   1,300 ETB
   ████████████████████████████████
2  Macchiato                  ×1      70 ETB
   ████████████████
```

- Line 1 `flex items-baseline gap-3`: rank `w-5 flex-none text-sm font-semibold
  text-text-subtle tabular-nums` (`"1"`); name `min-w-0 flex-1 text-md font-semibold
  text-text` (wraps, never truncated — Amharic names run long); quantity `"×2"` (U+00D7)
  `text-md font-semibold text-text tabular-nums`; revenue `"1,300 ETB"` `text-sm
  text-text-muted tabular-nums whitespace-nowrap`.
- Line 2 `mt-2 ml-8`: bar `h-item-bar rounded-r-full bg-chart-bar`, `style={{ width: pct
  + '%' }}`, `pct = quantity / top quantity × 100` (min 2). No track behind it (the air is
  the scale). `transition-[width] duration-400`.
- One series → one colour (`chart-bar`) for every row; never coloured by rank or category.
  Every value is printed, so there is no tooltip here.
- `<ol>` `aria-label="Top items today"`; each `<li>` reads
  `"1. Beef Tibs, 2 ordered, 1,300 ETB order value"` (sr-only text; the visible parts
  `aria-hidden`).

**No orders yet** (`orders_today === 0` — this card follows orders, not payments): body
`px-5 pb-6 pt-2 text-center`: `"Nothing ordered yet"` `text-md font-semibold`, `mt-1`
`"Today's five most ordered items show here."` `text-sm text-text-muted`.

### 7. Payment mix (left group, second row, right)

Header: `<h2>` `"Payment mix"`; subtitle `"Share of today's paid sales"`.

Body `px-5 pb-5`:

1. **Stacked bar** (part-to-whole, one bar): `flex w-full h-mix-bar rounded-full
   overflow-hidden`. One segment per method **with sales**, in `PAYMENT_METHODS` order
   (Cash, Telebirr, CBE Birr — never re-sorted by size), `style={{ width: share + '%' }}`,
   `bg-payment-{method}`. Segments after the first get `border-l-2 border-surface` — the
   2 px surface gap; no outlines. `transition-[width] duration-400`. No text inside
   segments. `aria-hidden` (the legend carries every value).
2. **Legend** `mt-5 flex flex-col gap-3`, always all three methods in the same order:
   row `flex items-center gap-3`:
   - swatch `size-3 flex-none rounded-sm bg-payment-{method}` (`aria-hidden`);
   - label `flex-1 text-md text-text` — `"Cash"`, `"Telebirr"`, `"CBE Birr"` (same strings
     as the waiter's PaymentSheet);
   - amount `text-md font-semibold text-text tabular-nums whitespace-nowrap`
     `"1,370 ETB"`;
   - share `w-12 text-right text-sm text-text-muted tabular-nums` `"100%"`.
   - A method with no sales: amount `"0 ETB"` and share `"0%"` in `text-text-subtle`;
     swatch stays (identity never disappears).
3. **Shares** are by ETB, whole percents, largest-remainder rounding so the three always
   add to 100. A non-zero share under 0.5 % shows `"<1%"`.
4. **Hover:** pointer over a segment or a legend row highlights the pair: the legend row
   gets `bg-surface-muted rounded-md` (row needs `-mx-2 px-2` so the fill has room) and
   the Tooltip over the segment shows `"1,370 ETB"` / `"Telebirr · 1 paid order"`. Values
   are all printed in the legend, so nothing is tooltip-only.

Colour follows the method, fixed by `PAYMENT_METHODS` key: Cash = `payment-cash`
(saffron), Telebirr = `payment-telebirr` (blue), CBE Birr = `payment-cbe-birr` (plum).
Validated as a set (see Tokens added). Status colours are never used here.

**No paid sales yet:** body `px-5 pb-6 pt-2 text-center`: `"No payments yet"` `text-md
font-semibold`, `mt-1` `"Cash, Telebirr and CBE Birr shares show here."` `text-sm
text-text-muted`.

### Tooltip (new, used by §5 and §7)

`absolute z-10 pointer-events-none bg-surface border border-border rounded-md shadow-md
px-3 py-2 whitespace-nowrap`, placed `bottom-full mb-2` centred on its mark, clamped to the
card. Value line first (strong), label line second (muted). No arrow. `role="tooltip"`;
the focused element references it with `aria-describedby`. Appears instantly (no delay, no
fade) and hides on pointer leave / blur / Esc.

---

## Fresh morning (0 orders today) — the first thing the client sees

After a plain reset the page must look **ready**, not empty. `orders_today === 0`:

```
Dashboard                                                          (● Live)
Today · Sunday 18 October

┌──────────────────────────────────────────────────────────────────────────┐
│  (☕)   No orders yet today                                                │
│        Sales, orders and the floor update here live — the moment a        │
│        waiter sends the first order.                                      │
└──────────────────────────────────────────────────────────────────────────┘
┌ Sales by hour ─────────────────────────────┐ ┌ Live floor ──────────────┐
│ Paid sales per hour, Addis Ababa time      │ │        (🍽)               │
│                                            │ │     No open orders        │
│            No sales yet today              │ │  New orders appear here … │
│   Each hour's paid sales show here as a bar│ └───────────────────────────┘
│ ─────────────────────────────────░░──────  │ ┌ Stock alerts  Open stock →┐
│ 06:00  08:00  10:00  12:00  14:00 Now      │ │ ✓ All stock is above its  │
└────────────────────────────────────────────┘ │   low level               │
┌ Top items today ───┐ ┌ Payment mix ────────┐ └───────────────────────────┘
│ Nothing ordered yet│ │  No payments yet    │
└────────────────────┘ └─────────────────────┘
```

- The **tiles row is replaced by the hero card** (only while `orders_today === 0`):
  `rounded-xl bg-surface border border-border shadow-sm p-6 flex items-center gap-5`
  (below `md`: `flex-col text-center p-6`):
  - icon circle `size-hero-circle flex-none rounded-full bg-primary-soft grid
    place-items-center`, icon `cafe-outline` (new icon) `size-icon-xl text-primary`
    (5.23:1 on primary-soft);
  - title `"No orders yet today"` `text-xl font-bold text-text` (an `<h2>`);
  - `mt-1` body `"Sales, orders and the floor update here live — the moment a waiter sends
    the first order."` `text-md text-text-muted`.
- Every other section shows its own quiet empty state (defined above). Stock alerts show
  real stock (normally "All stock is above its low level").
- No zero tiles anywhere, no `0 ETB` hero, no empty axes with ticks: every empty area says
  in words what will appear there.

**First order sent** (`orders_today` goes 0 → 1): the hero is replaced by the four tiles
(tiles enter `opacity-0 translate-y-2` → `opacity-100 translate-y-0`, `duration-250`
= `timing.enterMs`, staggered 0 / 50 / 100 / 150 ms; reduced motion: no transform, no
stagger). Tiles now read: **Sales today 0 ETB** · "No paid orders yet"; **Orders today 1**
· "0 paid · 1 open"; **Average order —** · "Shows after the first payment"; **Open orders
1** · "Oldest: Table 4 · Just now". The Live floor shows Table 4 under Sent. **Top items**
fills at once (Beef Tibs ×2 1,300 ETB, Macchiato ×1 70 ETB). Sales by hour and Payment mix
keep their empty states until the first payment.

Zero sales next to a real order count reads as "not paid yet", which is the truth — the
captions say so.

---

## Live arrival

All live changes come from a refetch after a Realtime event. Compare the new response
with what is on screen and animate only what changed. A refetch **never** shows skeletons
or dims the page; the previous numbers stay until the new ones arrive.

| What changed | What the owner sees |
|---|---|
| **Tile value** (any tile) | Value **counts up/down** from the old to the new number over `timing.countUpMs` (600, new), ease-out, via `requestAnimationFrame`, formatted every frame (`"1,370"`, never decimals mid-count). The tile flashes: `bg-primary-soft` at once, holds `timing.rowFlashHoldMs`, back to `bg-surface` with `transition-colors duration-1500` (`timing.rowFlashFadeMs`). |
| **Sales today / Orders today went up** | Delta slot shows the increase: `"+1,370 ETB"` / `"+1"`, `text-success font-semibold`, for `timing.deltaShowMs` (6 s), then fades (`transition-opacity duration-300`). A second increase while it shows **adds up** and restarts the timer (same as Stock). Never shown for decreases or on first load. |
| **New open order** | Row inserted in its group (Sent) at its time position, enters `opacity-0 translate-y-2` → in, `duration-250`, with the row flash (`bg-primary-soft`, hold, fade). Group count updates. Top items rows that changed flash and re-sort (it counts sent orders). |
| **Status change** (Sent → Preparing → Ready → Served) | Row leaves the old group (no exit animation) and appears in the new one with the enter + flash. |
| **Paid** | Row fades out (`opacity-0`, `duration-250`) then is removed. Same refetch: Sales today and Average count up with the flash; Sales today shows its delta; the current hour's bar grows (and, if the scale changes, every bar rescales together); Payment mix segments resize and the method's legend row flashes. |
| **Sales by hour bar changed** | Height animates (`duration-400`). The bar turns `bg-primary` at once, holds `timing.rowFlashHoldMs`, then returns to `bg-chart-bar` over `timing.rowFlashFadeMs`. The peak label moves to the new peak. |
| **Top items order changed** | Rows re-sort instantly (no movement animation); changed rows flash. A new item entering the top 5 flashes; one pushed out disappears. |
| **Stock alert appears / clears** | From `StockProvider`: a new low row is inserted with the row flash; a cleared row disappears. Card switches to/from "All stock is above its low level". |
| **Wait times** | Re-render every `timing.timerTickMs`; a row turning Late just switches to the Late chip (no flash — it's not news, it's time). |

`prefers-reduced-motion`: no count-up (the value switches), no enter/exit transforms or
fades, no bar/segment animation; flashes still apply and remove (colour only) and deltas
still show for 6 s.

**Screen readers:** one `sr-only` `aria-live="polite"` region announces only two kinds of
event: `"New order: Table 4."` and `"Table 4 paid 1,370 ETB with Telebirr. Sales today
1,370 ETB."` Status changes, wait times and count-ups are not announced (constant noise).

---

## States (whole page)

| State | What shows |
|---|---|
| **Loading** (first load, no data yet) | Header renders with the date subtitle; LivePill `Connecting…`. Tiles: 4 real tile containers holding skeletons `h-5 w-1/2`, `h-10 w-2/3`, `h-4 w-3/4` (`rounded-sm`). Sales by hour card: real header; plot area a skeleton `h-chart-plot w-full rounded-md` (below md `h-chart-plot-sm`). Top items: 3 rows of `h-5 w-2/3` + `h-item-bar w-1/2 rounded-full`. Payment mix: `h-mix-bar w-full rounded-full` + 3 rows `h-5 w-full`. Live floor: real header + 2 skeleton rows (`h-5 w-1/3`, `h-4 w-2/3`). Stock alerts: its own loading. Container `aria-busy="true"` + sr-only `"Loading"`. Never the hero during loading (the client must not see "No orders" flash before real orders arrive). |
| **Loaded, fresh day** | Hero + empty states (above). |
| **Loaded** | As designed. |
| **Load failed** (first `dashboard_today()` fails or times out after 15 s) | Header (date) + LivePill. Tiles, Live floor, Sales by hour, Top items and Payment mix are replaced by one card `bg-surface border border-border rounded-xl py-16` with EmptyState **error**: `"Can't load today's numbers"`, `"Check your connection and try again."`, Button `secondary` `"Try again"` (refetch, back to Loading). **Stock alerts still render** below it (it has its own data). |
| **Not allowed** (`42501` — a role change mid-session) | Same card, EmptyState icon `person-circle-outline`: `"You can't see the dashboard"` / `"Only managers and owners can see sales. Sign in with one of those accounts."`, no button. |
| **Refresh failed** (data on screen, a later refetch fails) | Keep every number on screen. Banner `error` in the banner slot: `"Couldn't update today's numbers"` / `"Showing the last numbers we had."` with `ghost` `"Retry"`. Cleared by the next successful refetch (any event or Retry). |
| **Connecting / Reconnecting** | LivePill only (as on Stock). Nothing else changes. |
| **Offline** (not `SUBSCRIBED` after `timing.offlineBannerDelayMs`) | LivePill `Offline` + Banner `error` `"Connection lost"` / `"Numbers won't update until it's back. Trying again…"`, action `"Retry now"` (re-create the channel, refetch). Everything stays on screen; wait times keep counting. |
| **Back online** | After the refetch has finished: Banner `success` `"Back online. Today's numbers are up to date."` for `timing.backOnlineMs`. Numbers that changed while offline switch **without** count-up or delta (we don't know when they happened); changed rows/tiles still flash once. |
| **New day at midnight** | The date subtitle changes, the refetch returns today's (empty) numbers, the page shows the fresh-day hero again (open orders from yesterday stay on the Live floor — they are still open). No banner. |

---

## Layout — `lg` (1024–1279) and `md` (768–1023)

Frame per `04-web-shell.md` (sidebar at `lg`, top bar at `md`). Single column:

1. Header, banner slot.
2. Tiles `grid-cols-2` (2×2), or the hero.
3. Right group as two columns: Live floor | Stock alerts (`md:grid-cols-2`, `items-start`).
4. Sales by hour, full width (plot `h-chart-plot`, labels every 2nd hour).
5. Top items | Payment mix (`md:grid-cols-2`).

## Layout — phone (< `md`, designed at 390)

```
Dashboard                          (● Live)
Today · Sunday 18 October

┌ ◎ Sales today ┐ ┌ ▣ Orders today┐
│ 1,370 ETB     │ │ 1             │
│ From 1 paid … │ │ 1 paid · 0 open│
└───────────────┘ └───────────────┘
┌ ◇ Average ord.┐ ┌ ⌂ Open orders ┐
│ 1,370 ETB     │ │ 0             │
│ Per paid order│ │ Nothing wait… │
└───────────────┘ └───────────────┘
┌ Live floor ──────────────────────┐
│ [✈ Sent]                       1 │
│ Table 4                  4 min   │
│ #12 · 3 items · Hana Tesfaye     │
│ [🔥 Preparing] 0 …               │
└──────────────────────────────────┘
┌ Stock alerts        Open stock → ┐
└──────────────────────────────────┘
┌ Sales by hour ───────────────────┐
│ 160 tall plot, labels every 3 h  │
└──────────────────────────────────┘
┌ Top items today ─────────────────┐
┌ Payment mix ─────────────────────┐
```

- Main wrapper `px-4 py-6` (frame). Nothing scrolls sideways.
- Header: title and LivePill on one row (`flex items-start justify-between`), subtitle
  under (same as Stock on phone).
- Tiles `grid-cols-2 gap-3`, tile padding `p-4`, number `text-2xl`, unit `text-md`;
  captions `text-sm line-clamp-2`. `"12,480 ETB"` at `text-2xl` is ≈ 140 wide; a tile's
  inner width at 390 is 141, and the unit wraps under the number if needed.
- Hero: column, centred, `p-6`.
- Order: tiles → Live floor → Stock alerts → Sales by hour → Top items → Payment mix
  (DOM order; no CSS reordering).
- Sales by hour: `h-chart-plot-sm` (160), labels every 3rd hour, bars `w-3/5` of a ≈ 18 px
  slot (≈ 11 px wide). Tooltip on tap (a tap selects a slot like hover; tapping outside
  hides it).
- Cards' header and body padding `px-4` instead of `px-5`.
- No sticky action bar on this page.

---

## Routing changes that come with this page (for `web`, from `04-web-shell.md`)

- `/` → manager/owner now redirects to **`/dashboard`** (was `/stock`).
- After sign-in with no valid `next`, go to **`/dashboard`**.
- The sidebar / top-bar brand row links to **`/dashboard`**.
- Wrong-role page: a manager/owner landing there redirects to **`/dashboard`**.
- Tab title stays `"Dashboard · Key Solutions"`. The Dashboard NavItem is first, as now.

`04-web-shell.md` is not edited in this slice (slice 4 is under review); this section
supersedes those four lines.

## New icons

Add to `web/src/components/icons.tsx` (Ionicons 7.4.0, same method): `cash-outline`,
`pricetag-outline`, `cafe-outline`, `paper-plane-outline`, `checkmark-circle-outline`,
`arrow-forward-outline`. Already present and reused: `receipt-outline`,
`restaurant-outline`, `flame-outline`, `time-outline`, `alert-circle`, `warning-outline`,
`checkmark-circle`, `person-circle-outline`, `cloud-offline-outline`.

## New formatting helpers (`web/src/lib/format.ts`)

| Function | Rule | Examples |
|---|---|---|
| `formatEtb(n)` | As the mobile rule (`components.md` → Money). | `1370 → "1,370 ETB"`, `0 → "0 ETB"`, `70 → "70 ETB"` |
| `formatEtbNumber(n)` | The number part only, for the tile split. | `1370 → "1,370"` |
| `formatEtbCompact(n)` | Axis ticks only: `< 1000` as is; `≥ 1000` → `K` with at most one decimal, `.0` dropped. | `500 → "500"`, `1000 → "1K"`, `1500 → "1.5K"`, `12000 → "12K"` |
| `formatWait(minutes)` | Kitchen timer words. | `0 → "Just now"`, `4 → "4 min"`, `65 → "1 h 5 min"` |
| `formatHourRange(h)` | Addis hour slot. | `14 → "14:00–15:00"`, `23 → "23:00–24:00"` |
| `formatDateLong(now)` | Header subtitle date, Addis. | `"Sunday 18 October"` |
| `sharePercents(values)` | Whole percents, largest remainder, sum 100; `0 < x < 0.5%` → `"<1%"`. | `[0, 1370, 0] → ["0%", "100%", "0%"]` |

## Demo walk-through ("Done when")

1. **After plain reset:** header `"Today · …"`, LivePill **Live**, hero **"No orders yet
   today"**, Sales by hour baseline with the Now band and "No sales yet today", Top items
   "Nothing ordered yet", Payment mix "No payments yet", Live floor "No open orders", Stock
   alerts "All stock is above its low level". No zeros anywhere.
2. **Waiter sends Table 4 (2 Beef Tibs + 1 Macchiato):** within ~1 s the hero gives way to
   the tiles — **Open orders 1** "Oldest: Table 4 · Just now", **Orders today 1** (+1)
   "0 paid · 1 open", Sales today 0 ETB "No paid orders yet". Top items: **Beef Tibs ×2
   1,300 ETB**, **Macchiato ×1 70 ETB** already (ordered, not yet paid). Live floor: **Sent 1**,
   "Table 4 · #12 · 3 items · Hana Tesfaye · Just now", flashing. Stock alerts: **Beef**
   appears (4.8 kg left · low below 5 kg, Low).
3. **Cook: Preparing → Ready; waiter: Served → Paid (Telebirr):** the row walks
   Sent → Preparing → Ready → Served, flashing at each step, then fades out. **Sales
   today counts up to 1,370 ETB** (+1,370 ETB), "From 1 paid order"; Average order 1,370
   ETB; Open orders 0 "Nothing waiting on the floor". Sales by hour: one bar in the Now
   slot labelled "1,370" (scale 0 / 1K / 2K). Top items unchanged: **1 Beef Tibs ×2
   1,300 ETB**, **2 Macchiato ×1 70 ETB**. Orders today caption "1 paid · 0 open". Payment mix: one full blue bar, **Telebirr 1,370 ETB 100%**,
   Cash and CBE Birr 0 ETB 0%. Screen reader hears "Table 4 paid 1,370 ETB with
   Telebirr. Sales today 1,370 ETB."
4. **Demo-day script:** ~25 paid orders across the morning and afternoon → bars from 07:00
   to now with a lunch peak, "Busiest: 13:00 · …", five top items, a three-way payment mix.

## Copy (all strings, exact)

- `"Dashboard"`, `"Today · {Weekday} {d} {Month}"`
- Tiles: `"Sales today"`, `"No paid orders yet"`, `"From 1 paid order"`,
  `"From {n} paid orders"`; `"Orders today"`, `"{paid} paid · {open} open"`; `"Average order"`,
  `"Per paid order"`, `"Shows after the first payment"`, `"—"`; `"Open orders"`,
  `"Nothing waiting on the floor"`, `"Oldest: Table {n} · {wait}"`,
  `"Oldest: Table {n} · {wait} · Late"`; unit `"ETB"`; deltas `"+{amount} ETB"`, `"+{n}"`
- Tile a11y: `"{label}: {value}, {caption}"`
- Hero: `"No orders yet today"`,
  `"Sales, orders and the floor update here live — the moment a waiter sends the first order."`
- Live floor: `"Live floor"`, `"Open orders by status, oldest first"`, `"Sent"`,
  `"Preparing"`, `"Ready"`, `"Served"`, `" open"` (sr-only), `"Table {n}"`,
  `"#{id} · {n} items · {waiter}"`, `"1 item"`, `"Just now"`, `"{m} min"`,
  `"{h} h {m} min"`, `"{wait} · Late"`, `"No open orders"`,
  `"New orders appear here the moment a waiter sends them."`
- Row a11y: `"Table {n}, order {id}, {n} items, {waiter}, sent {m} minutes ago"`,
  `"sent just now"`, `", late"`
- Stock alerts: `"Stock alerts"`, `"Ingredients below their low level"`, `"Open stock"`,
  `"{qty} left · low below {qty}"`, `"None left · low below {qty}"`,
  `"{name}: {qty} left, low. Open in Stock."` / `"{name}: none left, out. Open in Stock."`,
  `"See all {n} low ingredients"`, `"All stock is above its low level"`,
  `"Nothing needs restocking right now."`, `"Couldn't load stock"`, `"Check your connection."`, `"Retry"`
- Sales by hour: `"Sales by hour"`, `"Paid sales per hour, Addis Ababa time"`,
  `"Busiest:"`, `"{HH:mm} · {amount} ETB"`, `"Now"`, `"{amount} ETB"`,
  `"{HH:mm}–{HH:mm}"`,
  `"Sales by hour. Use the left and right arrow keys to read each hour."`,
  `"Paid sales by hour"`, `"Hour"`, `"Sales"`, `"No sales yet today"`,
  `"Each hour's paid sales show here as a bar."`
- Top items: `"Top items today"`, `"Most ordered today, paid or not · ETB is order value"`,
  `"×{n}"`, `"{rank}. {name}, {n} ordered, {amount} ETB order value"`,
  `"Nothing ordered yet"`, `"Today's five most ordered items show here."`
- Payment mix: `"Payment mix"`, `"Share of today's paid sales"`, `"Cash"`, `"Telebirr"`,
  `"CBE Birr"`, `"{n}%"`, `"<1%"`, `"{method} · 1 paid order"` / `"… · {n} paid orders"`,
  `"No payments yet"`, `"Cash, Telebirr and CBE Birr shares show here."`
- Announcements: `"New order: Table {n}."`,
  `"Table {n} paid {amount} ETB with {method}. Sales today {amount} ETB."`
- States: `"Loading"`, `"Can't load today's numbers"`, `"Check your connection and try again."`,
  `"Try again"`, `"You can't see the dashboard"`,
  `"Only managers and owners can see sales. Sign in with one of those accounts."`,
  `"Couldn't update today's numbers"`, `"Showing the last numbers we had."`, `"Retry"`,
  `"Connecting…"`, `"Live"`, `"Reconnecting…"`, `"Offline"`, `"Connection lost"`,
  `"Numbers won't update until it's back. Trying again…"`, `"Retry now"`,
  `"Back online. Today's numbers are up to date."`

---

## Tokens added

**Applied** in `design/tokens.ts`, `design/tokens.css` regenerated. All of these go into objects the
generator already walks (`palette`, `colors`, `size`, `radius`, `timing`), so the generator
needs **no change**; `dashboard` is TS-only (no CSS).

### Colours

```ts
// palette (raw)
saffron600: '#C77A12', // payment: Cash
blue600: '#2F6BC4',    // payment: Telebirr
plum600: '#A63D72',    // payment: CBE Birr

// colors (light theme) — chart marks. Non-text: 3:1+ on surface.
/** Single-series chart marks (sales by hour, top items). 6.57:1 on surface. */
chartBar: palette.coffee600,
/** Hovered / focused bar. 16.28:1 on surface. */
chartBarActive: palette.coffee900,
/** Payment mix — colour follows the method (PAYMENT_METHODS), never its rank. */
paymentCash: palette.saffron600,     // 3.38:1 on surface
paymentTelebirr: palette.blue600,    // 5.22:1
paymentCbeBirr: palette.plum600,     // 5.95:1
```

Classes generated: `bg-chart-bar`, `bg-chart-bar-active`, `bg-payment-cash`,
`bg-payment-telebirr`, `bg-payment-cbe-birr`.

Optional typed map next to `statusColors` (compile-time check that every method has a
colour):

```ts
import type { OrderStatus, PaymentMethod } from '../shared/constants';
export const paymentColors = {
  cash: light.paymentCash,
  telebirr: light.paymentTelebirr,
  cbe_birr: light.paymentCbeBirr,
} as const satisfies Record<PaymentMethod, string>;
```

**Validation** (dataviz `validate_palette.js`, light mode, surface `#FFFFFF`,
`--pairs all` — stricter than needed for a 3-segment stack):

| Check | Result |
|---|---|
| Lightness band (OKLCH L 0.43–0.77) | PASS, all 3 |
| Chroma floor (C ≥ 0.10) | PASS, all 3 |
| CVD separation (protan/deutan, target ΔE ≥ 8) | PASS — worst pair plum↔blue ΔE 13.9 (protan); tritan 13.2 |
| Normal-vision floor (ΔE ≥ 15) | PASS — worst pair plum↔saffron ΔE 21.4 |
| Contrast vs surface (≥ 3:1) | PASS — saffron 3.38, blue 5.22, plum 5.95 |

Plus secondary encoding anyway: the legend prints every amount and share, and segments
are separated by the 2 px surface gap. Only the light theme ships, so no dark-mode steps
are proposed. The hues stay clear of the status set: blue600 is lighter and brighter than
`blue700` (Sent), and the floor's status chips always carry their word.

Other chart colours reuse existing tokens: gridlines `border` (cream200), baseline
`borderStrong` (cream300), Now band `surfaceMuted`, live flash `primary` /
`primarySoft`. Gridlines, baseline and the Now band are decorative (every value is
printed or in the table twin), so they are exempt from 3:1.

### Sizes and radius

```ts
// size (owner website, slice 5)
/** Sales by hour plot height (≥ md). */
chartPlot: 200,
/** Sales by hour plot height on phone (< md). */
chartPlotSm: 160,
/** Max width of one hourly bar. */
hourBar: 24,
/** Top items bar thickness. */
itemBar: 8,
/** Payment mix stacked bar height. */
mixBar: 16,

// radius
/** Data end of a chart bar (square at the baseline). */
bar: 4,
```

Classes: `h-chart-plot`, `h-chart-plot-sm`, `max-w-hour-bar`, `h-item-bar`,
`h-mix-bar`, `rounded-t-bar`.

### Timing

```ts
/** Dashboard tile values count from old to new. */
countUpMs: 600,
```

### Dashboard constants (TS only, not in CSS)

```ts
export const dashboard = {
  /** Sales by hour: first Addis hour always shown. */
  dayStartHour: 6,
  /** Sales by hour: shown up to (not including) this hour; stretches for now/sales. */
  dayEndHour: 22,
  /** Smallest y-axis maximum, ETB. */
  axisMinEtb: 1000,
  /** Rows in Top items today. */
  topItems: 5,
  /** Rows in Stock alerts before "See all". */
  stockAlertRows: 5,
} as const;
```

(and add `dashboard` to the `tokens` export object).

---

## Decisions (PM, slice 5)

1. **Top items counts every order sent today**, paid or not; its ETB is order value. Copy
   and states above follow this rule.
2. **No new backend fields.** No first-order time (Orders today caption is
   `"{paid} paid · {open} open"`) and no per-hour order count (hour tooltip shows the hour
   range only).
3. **Hour window 06–22** approved.
4. **Landing-page redirects** are routed to `web` by the PM.
5. Open orders from earlier days stay on the Live floor and in Open orders (backend
   already returns them) — don't narrow them to today.
