# 02 — Menu

Route: `/table/[tableId]/menu` — pushed on top of the waiter tabs (no tab bar).

## Purpose

Build an order for one table, fast, with one thumb: browse by category, tap a card to
add, +/− to adjust, then go to review. The demo path is: Main dishes → Beef Tibs ×2 →
Hot drinks → Macchiato ×1 → Review order.

## The draft order (state)

- Held in memory in one app-wide store (React context), not in the database, until it
  is sent. One draft at a time: `{ tableId, lines: [{ menuItemId, quantity, note }] }`.
- One line per menu item. Adding an item that is already in the draft increases its
  quantity. The note belongs to the line (set on the Cart screen).
- The draft keeps a copy of each item's `name`, `price_etb` and `category sort_order`
  so Cart can render without refetching.
- Totals are computed from the draft, never stored: total = Σ quantity × price_etb.
- Cleared when: the order is sent successfully, the waiter discards it, or signs out.

## Data

- `menu_categories` ordered by `sort_order`.
- `menu_items` where `is_available = true`, ordered by `category_id` then `sort_order`
  (`id, category_id, name, price_etb, sort_order`).
- `dining_tables` row for `tableId` (for the number and seats) — pass `number` and
  `seats` as route params from Tables so the title renders instantly; the fetch is only
  a fallback.
- Fetch once per visit; the menu doesn't change during a demo. No pull-to-refresh.

## Layout, top → bottom

1. **`TopBar` `stack`**
   - Title `"Table 4"` (`"Table {number}"`).
   - Subtitle `"New order · 4 seats"` (`"New order · {seats} seats"`).
   - Right: when the draft has items, a `ghost` button `"Clear"` (not full width).
     Hidden when empty.
2. **`CategoryTabs`** — sticky under the top bar (render it outside the ScrollView, so
   it never scrolls away). bg `colors.background`. Bottom border 1 `colors.border`.
3. **Item list** — one vertical `ScrollView` (14 items; no virtualization needed),
   gutter `spacing[4]`:
   - For each category, a **section**:
     - Section header: `spacing[5]` top (first section `spacing[4]`), category name
       `fontSize.lg` / `lineHeight.lg` `fontWeight.bold` `colors.text`; right-aligned on
       the same row, the item count `"4 items"` `fontSize.sm` `colors.textSubtle`.
       `spacing[3]` below.
     - Items in rows of two: row `flexDirection: 'row'`, gap `spacing[3]`; each card
       `flex: 1`. Row gap `spacing[3]`. Odd last item: render an empty `flex: 1` spacer
       so the card stays half width.
     - Card: `MenuItemCard` (see components) — category-tinted `ItemTile`, name, price,
       Add / stepper.
   - Bottom padding: `touch.primaryAction + spacing[3] * 2 + insets.bottom` when the
     cart bar shows, so the last cards scroll above it; `insets.bottom + spacing[6]`
     otherwise.
4. **`CartBar`** — floating at the bottom, only when the draft has ≥ 1 item:
   `[3]  Review order          1,370 ETB ›`.

Why one long list with jump-tabs instead of one category per tab: the waiter can scroll
the whole menu with a thumb, and the tabs still jump straight to a category. Section
headers make categories obvious even without tapping tabs.

## Behaviour

- **Tap a category tab** → scroll the list so that section's header sits at the top
  (`scrollTo({ y: sectionY - spacing[2], animated: true })`, `sectionY` from
  `onLayout`). The tapped tab becomes active immediately.
- **Scroll the list** → the active tab follows the section whose header has passed the
  top (throttle `scrollEventThrottle={16}`; compute from section `y`s). Keep the active
  tab visible in the tab row (`scrollTo` the tab row too).
- **Tap a card with quantity 0** → add 1. Card turns selected, stepper replaces Add,
  count pill appears, CartBar appears (first item) or updates.
- **`+`** → quantity + 1. **`−`** → quantity − 1. At quantity 1, `−` (trash icon)
  removes the line; the card returns to the Add state.
- **Category tab counts** update with the draft (`"Main dishes · 2"`).
- **Tap CartBar** → `router.push('/table/[tableId]/cart')`.
- **Clear** → `Alert.alert`: title `"Clear this order?"`, message
  `"All items for Table {number} will be removed."`, buttons `"Cancel"` (cancel),
  `"Clear"` (destructive). Confirm → empty the draft (stay on this screen).
- **Back** (top-bar back, Android back, swipe-back):
  - Draft empty → go back to Tables.
  - Draft has items → `Alert.alert`: title `"Discard this order?"`, message
    `"The items for Table {number} haven't been sent to the kitchen."`, buttons
    `"Keep editing"` (cancel), `"Discard"` (destructive). Discard → clear draft, go
    back. Use Expo Router's `usePreventRemove` / `beforeRemove` so every back path
    is covered.
- **Opening Menu for a different table while a draft exists** can't happen (back
  discards), so there's never more than one draft.
- **Opening Menu for the same table again from Cart** (Cart → back) keeps the draft.

## States

| State | What shows |
|---|---|
| **Loading** | Top bar with title (from params). Tab row: 4 `Skeleton` pills, `spacing[10]` tall, widths `spacing[16]`, `spacing[16] + spacing[8]`, `spacing[16] + spacing[4]`, `spacing[16] + spacing[6]`. List: one section-header skeleton (`spacing[16] * 2` × `spacing[5]`), then 2 rows of 2 card skeletons (tile block `size.tileCard` tall + two text blocks + a `touch.minTarget` block), radius `radius.lg`. No CartBar. |
| **Loaded, draft empty** | Cards in Add state, no CartBar, no Clear. |
| **Loaded, items added** | Selected cards, tab counts, CartBar, Clear. |
| **Error** | Below the top bar (no tabs): `EmptyState` error variant: title `"Couldn't load the menu"`, body `"Check your connection and try again."`, button `"Try again"` → refetch. If a draft exists (came back from Cart), keep it and still show CartBar so the waiter can review and send. |
| **Empty menu** (0 available items) | `EmptyState`, icon `restaurant-outline`: title `"The menu is empty"`, body `"Ask your manager to add items."` |
| **Empty category** (no available items in a category) | Hide that category's tab and section. |
| **Card pressed / selected / max** | See `MenuItemCard`, `QuantityStepper`. |

## Accessibility

- CartBar announces `"Review order, 3 items, 1,370 ETB"`; when it first appears, call
  `AccessibilityInfo.announceForAccessibility('Added Beef Tibs')` on each add (cheap and
  helpful for screen-reader users; silent otherwise).
- Tabs are `accessibilityRole="tab"` inside an `accessibilityRole="tablist"` row.

## Copy (all strings)

- `"Table {number}"`, `"New order · {seats} seats"`
- `"Clear"`, `"Clear this order?"`, `"All items for Table {number} will be removed."`,
  `"Cancel"`
- `"Discard this order?"`,
  `"The items for Table {number} haven't been sent to the kitchen."`,
  `"Keep editing"`, `"Discard"`
- `"{category} · {count}"` (tab with count), `"1 item"` / `"{n} items"`
- `"Add"`, `"Review order"`
- a11y: `"Add one {item}"`, `"Remove one {item}"`, `"Remove {item}"`,
  `"{item}, {price}"`, `", {n} in order"`, `"Adds one to the order"`,
  `"Added {item}"`, `"Review order, {count}, {total}"`
- `"Couldn't load the menu"`, `"Check your connection and try again."`, `"Try again"`
- `"The menu is empty"`, `"Ask your manager to add items."`
