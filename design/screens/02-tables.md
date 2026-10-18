# 02 — Tables

Route: waiter tabs → **Tables** (the waiter's home after sign-in).

## Purpose

Show all 8 tables at a glance — which are free and which have an open order — and start
an order with one tap. Show who is signed in, and let them sign out.

## Data

- `dining_tables` ordered by `number` (8 rows: numbers 1–8, seats 2,2,4,4,4,6,2,8).
- Open orders: `orders` where `status <> 'paid'` (`select id, table_id, status,
  created_at`), all waiters (a table is busy no matter who took the order; RLS allows
  staff to read all orders). Group by `table_id`; per table keep the count and the most
  recent order (by `created_at`).
- Waiter name: `profiles.full_name` of the signed-in user (already loaded at sign-in).
- Load all three in parallel. Refetch when the screen gains focus
  (`useFocusEffect`) — so after sending an order, Table 4 already shows as open — and on
  pull-to-refresh. Live updates arrive in slice 3.

## Layout, top → bottom

1. **`TopBar` `home`**
   - Eyebrow: greeting by local time — `"Good morning"` (00:00–11:59),
     `"Good afternoon"` (12:00–16:59), `"Good evening"` (17:00–23:59).
   - Title: the waiter's `full_name`, e.g. `"Hana Tesfaye"`, `numberOfLines={1}`.
     Empty name → `"Waiter"`.
   - Right: `ghost` button, icon `log-out-outline`, label `"Sign out"`.
2. `spacing[2]`, **Summary line** (gutter `spacing[4]`): `"3 free · 5 with orders"`
   style — `"{free} free · {open} with orders"` `fontSize.sm` `colors.textMuted`. When
   none are open: `"All 8 tables free"`. Gives the client a "live floor" feeling.
3. `spacing[4]`, **Section label**: `"Pick a table"` `fontSize.lg` / `lineHeight.lg`
   `fontWeight.bold` `colors.text`, gutter `spacing[4]`.
4. `spacing[3]`, **Table grid** — `FlatList` with `numColumns={2}`:
   - Content padding horizontal `spacing[4]`, bottom `spacing[6]` (tab bar handles the
     safe area).
   - Column gap `spacing[3]` (`columnWrapperStyle={{ gap: spacing[3] }}`), row gap
     `spacing[3]`. Each cell `flex: 1`.
   - Cell: `TableCard` (see components).
   - The greeting/summary/label (1–3) are the list's `ListHeaderComponent`, so the whole
     screen scrolls together and pull-to-refresh works anywhere.
5. **`TabBar`** — Tables active.

At 360 × 760 dp, all 8 cards fit with little or no scroll. Cards are tall (≥ 136) and
wide (~158) — easy one-thumb targets; tables 7–8 sit right above the tab bar.

## Behaviour

- **Tap a table** → `router.push` to Menu for that table
  (`/table/[tableId]/menu`, pass `tableId` = `dining_tables.id`, show `number`). Works
  the same for free and open tables (an open table can get another round).
- **Sign out** → native `Alert.alert`:
  - Title `"Sign out?"`, message `"You'll need your email and password to sign back in."`
  - Buttons: `"Cancel"` (style `cancel`), `"Sign out"` (style `destructive`).
  - Confirm → `supabase.auth.signOut()`, clear secure store, clear any in-memory draft
    order, `router.replace('/login')`. If the call fails offline, clear locally anyway.
- **Pull to refresh** → `RefreshControl` `colors={[colors.primary]}`
  `tintColor={colors.primary}`; refetches tables and open orders.
- Android back on this screen → leaves the app (default tab behaviour).

## States

| State | What shows |
|---|---|
| **Loading (first load)** | Top bar shows the name immediately (from session). Summary line hidden. Grid: 8 `Skeleton` cards, same size as `TableCard`, radius `radius.lg`; inside each, a `spacing[10]` × `spacing[3]` block top-left (the TABLE label) and a `spacing[8]` × `spacing[10]` block under it (the number). |
| **Loaded** | As above. |
| **Refreshing** | Pull spinner only; cards stay as they were. |
| **Error (first load failed)** | Below the section label, `EmptyState` error variant: title `"Couldn't load tables"`, body `"Check your connection and try again."`, button `"Try again"` → refetch. Top bar and tab bar stay usable. |
| **Error on refresh** | Keep the old cards; show `Banner` `error` above the grid: `"Couldn't refresh. Showing the last tables loaded."` with `ghost` action `"Retry"`. Dismisses on the next successful load. |
| **Empty** (0 tables — only if seed missing) | `EmptyState`, icon `grid-outline`: title `"No tables yet"`, body `"Ask your manager to add tables."` No button. |
| **Card pressed** | See `TableCard`. |
| **Signing out** | Alert confirm → screen stays; Sign out button shows a small `ActivityIndicator` in place of its icon until navigation. |

## Copy (all strings)

- `"Good morning"`, `"Good afternoon"`, `"Good evening"`
- `"Waiter"` (name fallback)
- `"Sign out"`, `"Sign out?"`, `"You'll need your email and password to sign back in."`,
  `"Cancel"`
- `"{free} free · {open} with orders"`, `"All {count} tables free"`
- `"Pick a table"`
- TableCard: `"TABLE"`, `"Free"`, `"+{n} more"`; a11y `"Table {n}, {seats} seats, free"`,
  `"Table {n}, {seats} seats, open order, status {status}"`, `"{seats} seats"`
- `"Couldn't load tables"`, `"Check your connection and try again."`, `"Try again"`
- `"Couldn't refresh. Showing the last tables loaded."`, `"Retry"`
- `"No tables yet"`, `"Ask your manager to add tables."`
- Tab labels: `"Tables"`, `"My orders"`
