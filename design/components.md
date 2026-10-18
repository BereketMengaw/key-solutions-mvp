# Components

Shared building blocks for the waiter/cook app (Expo). The owner website reuses the same
names and tokens where they apply. Every value below is a token from `design/tokens.ts`;
if a spec ever needs a raw number, it is a bug in this file — tell the designer.

Slice 2 uses everything here. Screen specs live in `design/screens/`.

## Global rules

- **Font:** `fontFamily.sans` (Noto Sans + Noto Sans Ethiopic). Every text style sets
  `fontSize.X` together with `lineHeight.X` (same key). Never set a fixed text height;
  let text wrap. Amharic arrives later and runs taller and longer.
- **Numbers that update** (prices, totals, quantities): add
  `fontVariant: ['tabular-nums']` so digits don't jump as they change.
- **Screen gutter:** `spacing[4]` left and right on every screen.
- **Background:** `colors.background` on every screen. Cards are `colors.surface`.
- **Touch:** anything tappable is at least `touch.minTarget` × `touch.minTarget`. If the
  visual is smaller (e.g. a 20 icon), pad it or use `hitSlop` to reach 48.
- **Pressed feedback:** use `Pressable` and change the background per component spec
  below. No Android ripple tint on top (it would fight the brand colors): set
  `android_ripple={null}`.
- **Safe areas:** use `react-native-safe-area-context` (ships with Expo Router). Bottom
  bars add `insets.bottom` to their bottom padding; top bars add `insets.top`.
- **Status bar:** `dark` content on `colors.background`.
- **Icons:** `Ionicons` from `@expo/vector-icons` (already a dependency of `expo`; if
  imports don't resolve, `npx expo install @expo/vector-icons`). No other icon set, no
  image assets. Icon names are given per component.
- **Strings:** every copy string in these specs goes into the app's single strings file.
  The key names are up to mobile; the English text must be exactly as written here.
- **Haptics:** none in this slice (would add `expo-haptics`).

## Formatting helpers (put in `mobile/lib/format.ts`)

### Money — `formatEtb(n: number): string`

- Whole amounts: thousands separator `,`, no decimals, a space, then `ETB`.
  `1370 → "1,370 ETB"`, `70 → "70 ETB"`, `0 → "0 ETB"`.
- Non-whole amounts (not in seed data, but `price_etb` is `numeric(10,2)`): two
  decimals. `12.5 → "12.50 ETB"`.
- Do not rely on `Intl`/`toLocaleString` (Hermes on some Android builds differs). Use:
  `n.toFixed(Number.isInteger(n) ? 0 : 2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')` then
  `+ ' ETB'`. (The regex only touches the integer part because the decimal part is two
  digits.)
- `ETB` always comes after the number. Never `Br`, never `ETB 1,370`.

### Quantity line — `"2 × Beef Tibs"`

Quantity, space, `×` (U+00D7, not the letter x), space, name.

### Item count — `"1 item"` / `"3 items"`

Counts **units**, not lines: 2 Beef Tibs + 1 Macchiato = `"3 items"`.

### Time — `"10:42"`

24-hour `HH:mm` in the phone's local time, from `orders.created_at`. Addis staff read
24-hour time without confusion and it is shorter. No date (My orders only shows today).

### Monogram — `monogram(name: string): string`

The text inside the item tile fallback.

- Two or more words: first letter of each of the first two words, both uppercase.
  `"Beef Tibs" → "BT"`, `"Enqulal Firfir" → "EF"`, `"Mango juice" → "MJ"`.
- One word: first letter uppercase + second letter lowercase.
  `"Firfir" → "Fi"`, `"Ful" → "Fu"`, `"Macchiato" → "Ma"`, `"Tea" → "Te"`.
- Use `Array.from(word)` (not `word[0]`) so a Ge'ez character is never split.
- For a single Ge'ez word (later, Amharic), one character is enough; the two-letter rule
  is for Latin names. Not needed this slice.

All 14 seed items get a unique monogram within their category with this rule.

---

## Button

The one button component. Variants: `primary`, `secondary`, `ghost`.

| | primary | secondary | ghost |
|---|---|---|---|
| Height | `touch.primaryAction` (56) | `touch.minTarget` (48) | `touch.minTarget` (48) |
| Background | `colors.primary` | `colors.surface` | transparent |
| Border | none | 1.5 `colors.borderControl` | none |
| Label color | `colors.textOnPrimary` | `colors.text` | `colors.primary` |
| Pressed bg | `colors.primaryPressed` | `colors.surfaceMuted` | `colors.primarySoft` |
| Radius | `radius.lg` | `radius.lg` | `radius.md` |

- Label: `fontSize.md` / `lineHeight.md`, `fontWeight.semibold`, centered. Primary
  label uses `fontSize.lg` / `lineHeight.lg`.
- Horizontal padding `spacing[5]`. Full width (`alignSelf: 'stretch'`) unless the screen
  says otherwise.
- Optional leading icon: `size.icon`, same color as the label, `spacing[2]` gap.
- Primary has `shadows.md`; the others `shadows.none`.

**States**

- **Loading:** label replaced by `ActivityIndicator` (`size="small"`, label color) +
  `spacing[2]` + the loading label given by the screen (e.g. `"Sending…"`). Same size
  and colors as default — the button must not shrink or flash. Not pressable.
- **Disabled:** bg `colors.surfaceMuted`, border 1.5 `colors.border`, label
  `colors.textSubtle`, no shadow. Not pressable. Screens avoid disabled primaries where
  possible (validate on tap instead) — see each screen.
- `accessibilityRole="button"`, `accessibilityState={{ disabled, busy: loading }}`.

## IconButton

Round icon-only button, used in top bars.

- Hit area `touch.minTarget` square, visual circle the same size, `radius.full`.
- Icon `size.iconLg`, color `colors.text` (or as the screen says).
- Default bg transparent; pressed bg `colors.surfaceMuted`.
- Always has `accessibilityLabel` (given per screen).

## TopBar

Sits under the status bar. Two layouts.

**`home`** (Tables, My orders)

- Padding: top `insets.top + spacing[3]`, bottom `spacing[3]`, sides `spacing[4]`.
- Background `colors.background` (no border; the content starts with `spacing[2]`).
- Left column: eyebrow line `fontSize.sm` `colors.textMuted` `fontWeight.medium`, then
  title `fontSize['2xl']` / `lineHeight['2xl']` `fontWeight.bold` `colors.text`.
- Right: a `ghost` text button (not full width) — e.g. `"Sign out"` with icon
  `log-out-outline` — vertically centered on the title.

**`stack`** (Menu, Cart)

- Height `touch.minTarget + spacing[3] * 2` plus `insets.top`. Background
  `colors.background`; bottom border 1 `colors.border` once content scrolls under it
  (optional polish; a permanent border is acceptable).
- Left: `IconButton` with `chevron-back`, `accessibilityLabel="Back"`.
- Center-left (after the back button, `spacing[1]` gap): title `fontSize.xl` /
  `lineHeight.xl` `fontWeight.bold`; optional subtitle under it `fontSize.sm`
  `colors.textMuted`.
- Right: optional, per screen.

## TextField

Label above, input, helper or error below.

- Label: `fontSize.sm` / `lineHeight.sm`, `fontWeight.semibold`, `colors.text`,
  `spacing[2]` below it.
- Input box: min height `touch.minTarget + spacing[2]` (56), padding horizontal
  `spacing[4]`, bg `colors.surface`, border 1.5 `colors.borderControl`, radius
  `radius.md`. Text `fontSize.md` / `lineHeight.md` `colors.text`. Placeholder color
  `colors.textSubtle`.
- **Focused:** border 2 `colors.focusRing`. (Keep total size equal: reduce padding by
  0.5 or accept the half-pixel; don't let the field jump.)
- **Error:** border 2 `colors.danger`; below the box, `spacing[2]` gap, a row: icon
  `alert-circle` `size.iconSm` `colors.danger` + `spacing[1]` + message `fontSize.sm`
  `colors.danger`. Error clears as soon as the user edits that field.
- **Disabled** (while submitting): bg `colors.surfaceMuted`, text `colors.textMuted`,
  border `colors.border`.
- **Password variant:** trailing `IconButton` inside the box (`eye-outline` /
  `eye-off-outline`, `colors.textMuted`), toggles `secureTextEntry`. Labels
  `"Show password"` / `"Hide password"`.
- Multiline variant (item note): same box, min height `touch.minTarget`, grows with
  content up to 3 lines, `fontSize.sm` / `lineHeight.sm`.

## StatusBadge

Pill showing an order status. **Always icon + text, never color alone.**

- Colors: `statusColors[status].bg` background, `statusColors[status].fg` for icon and
  text. Use the `OrderStatus` from `shared/constants.ts` as the key.
- Height: hugs content; padding vertical `spacing[1]`, horizontal `spacing[3]`;
  radius `radius.full`.
- Icon `size.iconSm` + `spacing[1]` + label `fontSize.sm` / `lineHeight.sm`
  `fontWeight.semibold`.
- Not tappable.

| status | Label | Ionicons |
|---|---|---|
| `sent` | `Sent` | `paper-plane-outline` |
| `preparing` | `Preparing` | `flame-outline` |
| `ready` | `Ready` | `checkmark-circle-outline` |
| `served` | `Served` | `restaurant-outline` |
| `paid` | `Paid` | `wallet-outline` |

Size `large` (My orders card): label `fontSize.md` / `lineHeight.md`, icon
`size.icon`, padding vertical `spacing[1]` horizontal `spacing[3]`.

`accessibilityLabel`: `"Status: Sent"` etc.

## ItemTile (photo fallback)

Menu items have no photos (`image_url` is null in seed data). Never render an `<Image>`
with a null or broken source. The tile is the item's picture.

- Color: `categoryTints[(category.sort_order - 1) % categoryTints.length]` —
  `bg` fills the tile, `fg` colors the monogram and the pattern.
- Content: the `monogram(name)` centered, `fontWeight.bold`, color `fg`,
  `letterSpacing: 0.5`.
- Texture (makes it look designed, not empty): two concentric rings behind the monogram,
  centered — circles with border 1.5 `fg` at `opacity: 0.12`, diameters 72% and 120% of
  the tile height (the larger one is clipped by `overflow: 'hidden'`). Pure `View`s with
  `radius.full`; no SVG, no images. Like a plate seen from above.

| Size | Box | Radius | Monogram |
|---|---|---|---|
| `card` (Menu) | full card width × `size.tileCard` | top corners `radius.lg`, bottom 0 | `fontSize['3xl']` / `lineHeight['3xl']` |
| `small` (Cart rows) | `size.tileSm` square | `radius.md` | `fontSize.md` / `lineHeight.md` |

Small tiles skip the outer ring (keep only the 72% ring).

`accessible={false}` — the item name next to it is the label.

When photos arrive in a later slice: if `image_url` is set, render the photo in the same
box with `resizeMode="cover"`, and keep the tile as the loading/error fallback.

## QuantityStepper

`[ − ]  2  [ + ]`

- Row, height `touch.minTarget`, items centered.
- Buttons: `touch.minTarget` square, radius `radius.md`.
  - `+`: bg `colors.primary`, icon `add` `size.iconLg` `colors.textOnPrimary`; pressed
    bg `colors.primaryPressed`. Label `"Add one {item}"`.
  - `−`: bg `colors.surface`, border 1.5 `colors.borderControl`, icon `remove`
    `size.iconLg` `colors.text`; pressed bg `colors.surfaceMuted`. Label
    `"Remove one {item}"`.
  - When quantity is 1, `−` shows `trash-outline` in `colors.danger` instead (pressing
    removes the item). Label `"Remove {item}"`.
- Count: min width `spacing[10]`, centered, `fontSize.lg` / `lineHeight.lg`,
  `fontWeight.bold`, `colors.text`, tabular nums.
  `accessibilityLiveRegion="polite"`.
- Max quantity 99 (`+` becomes disabled: bg `colors.surfaceMuted`, icon
  `colors.textSubtle`). Nobody hits this in the demo.
- No long-press repeat.

## MenuItemCard

One menu item in the Menu grid (2 columns).

```
┌───────────────────┐
│   ( ( BT ) )      │  ← ItemTile card size, tinted     [qty pill top-right when > 0]
├───────────────────┤
│ Beef Tibs         │  ← name
│ 650 ETB           │  ← price
│ [ + Add        ]  │  or  [ − ] 2 [ + ]
└───────────────────┘
```

- Container: bg `colors.surface`, radius `radius.lg`, `shadows.sm`, border 1
  `colors.border`, `overflow: 'hidden'`.
- Top: `ItemTile` `card`.
- Body padding `spacing[3]`, then:
  - Name: `fontSize.md` / `lineHeight.md`, `fontWeight.semibold`, `colors.text`,
    `numberOfLines={2}`. Reserve two lines of height (`minHeight: lineHeight.md * 2`)
    so prices line up across the row.
  - `spacing[1]`, price: `formatEtb(price_etb)`, `fontSize.md` `fontWeight.bold`
    `colors.primary`, tabular nums.
  - `spacing[3]`, the action row (height `touch.minTarget`):
    - **Quantity 0:** an "Add" pill, full card width, height `touch.minTarget`, bg
      `colors.primarySoft`, radius `radius.md`, icon `add` `size.icon` + `spacing[1]` +
      `"Add"`, both `colors.primary` `fontWeight.semibold` `fontSize.md`. Pressed bg
      `colors.primary`, content `colors.textOnPrimary`.
    - **Quantity ≥ 1:** `QuantityStepper`, spread across the card width
      (`justifyContent: 'space-between'`).
- **Tap target:** with quantity 0, the **whole card** adds one (the Add pill is the
  visual cue). With quantity ≥ 1, only the stepper buttons are active; tapping the rest
  of the card does nothing (prevents accidental adds while adjusting).
- **Selected (quantity ≥ 1):** border 2 `colors.primary` (instead of 1 `border`), and a
  count pill on the tile's top-right corner: offset `spacing[2]` from top and right,
  min width `spacing[6]`, height `spacing[6]`, radius `radius.full`, bg
  `colors.primary`, text `fontSize.xs` `fontWeight.bold` `colors.textOnPrimary`, e.g.
  `"2"`. The tile stays visible so the eye finds what's already in the order.
- **Pressed (quantity 0):** card bg `colors.surfaceMuted`, Add pill as pressed above.
- **Unavailable** (`is_available = false`; none in seed data, but the RPC rejects them):
  don't render it. The Menu query filters `is_available = true`.
- `accessibilityLabel`: `"Beef Tibs, 650 ETB"` + (`", 2 in order"` when > 0);
  `accessibilityHint` when 0: `"Adds one to the order"`.
- The description from the DB is **not** shown on the card (keeps the grid calm and
  two-line names aligned). It is available for a later detail view.

## CategoryTabs

Horizontal, scrollable row of pill tabs under the Menu top bar.

- Row: `ScrollView horizontal`, `showsHorizontalScrollIndicator={false}`, content
  padding horizontal `spacing[4]`, gap `spacing[2]`, vertical padding `spacing[2]`.
- Tab: height `touch.minTarget - spacing[2]` visual (40) with `hitSlop` 4 top/bottom so
  the target is 48; padding horizontal `spacing[4]`; radius `radius.full`.
  - Inactive: bg `colors.surface`, border 1.5 `colors.borderControl`, label `fontSize.sm`
    `fontWeight.semibold` `colors.textMuted`.
  - Active: bg `colors.text` (coffee900), no border, label `colors.textOnPrimary`
    (white on coffee900 = 16.3:1). Dark pill, not red: red is reserved for actions and
    selected items, so the tabs never compete with the Add buttons.
  - Pressed (inactive): bg `colors.surfaceMuted`.
- A small count after the label when the category has items in the order:
  `"Main dishes · 2"` (units). Same color as the label.
- Order: `menu_categories.sort_order`. Labels are the DB `name`.
- Tapping a tab scrolls the item list to that section (see Menu screen); scrolling the
  list updates the active tab. `accessibilityRole="tab"`, `accessibilityState.selected`.

## CartBar

Floating bar at the bottom of the Menu screen, in the thumb zone. Only rendered when the
order has at least one item.

- Container: absolute bottom, sides `spacing[4]`, bottom `insets.bottom + spacing[3]`.
- Bar: height `touch.primaryAction`, bg `colors.primary`, radius `radius.lg`,
  `shadows.lg`, padding horizontal `spacing[4]`, row, items centered.
  - Left: count bubble — min width `spacing[8]`, height `spacing[8]`, padding
    horizontal `spacing[2]`, radius
    `radius.full`, bg `colors.primaryPressed`, text count of units `fontSize.sm`
    `fontWeight.bold` `colors.textOnPrimary`.
  - `spacing[3]`, label `"Review order"` `fontSize.lg` `fontWeight.semibold`
    `colors.textOnPrimary`, flex 1.
  - Right: total `formatEtb(total)` `fontSize.lg` `fontWeight.bold`
    `colors.textOnPrimary`, tabular nums, + `spacing[1]` + `chevron-forward`
    `size.icon` white.
- Pressed: bg `colors.primaryPressed`, bubble bg `colors.primary`.
- Appears with a 150 ms slide-up + fade when the first item is added; disappears the
  same way when the order is emptied. (`Animated`/`LayoutAnimation`, no library.)
- `accessibilityLabel`: `"Review order, 3 items, 1,370 ETB"`.

## TableCard

One table in the Tables grid (2 columns).

```
┌─────────────────────┐
│ TABLE        👥 4    │
│ 4                    │
│                      │
│ ● Free               │   or   [ ✈ Sent ]  · 2 orders
└─────────────────────┘
```

- Container: min height `size.tableCard`; padding `spacing[4]`;
  radius `radius.lg`; bg `colors.surface`; border 1 `colors.border`; `shadows.sm`.
- Top row (space-between):
  - `"TABLE"` — `fontSize.xs` / `lineHeight.xs`, `fontWeight.semibold`,
    `colors.textMuted`, `letterSpacing: 1`. (Uppercase written in the string; don't
    use `textTransform` — it does nothing for Amharic.)
  - Seats: icon `people-outline` `size.iconSm` `colors.textMuted` + `spacing[1]` +
    `"4"` `fontSize.sm` `colors.textMuted`. `accessibilityLabel` `"4 seats"`.
- Number: `fontSize['3xl']` / `lineHeight['3xl']`, `fontWeight.bold`, `colors.text`,
  tabular nums.
- Bottom (pushed down with `marginTop: 'auto'`, `spacing[3]` min gap):
  - **Free** (no order with status ≠ `paid`): dot 8 (`spacing[2]`) `radius.full`
    `colors.success` + `spacing[2]` + `"Free"` `fontSize.sm` `fontWeight.semibold`
    `colors.success`. Card styling stays default.
  - **Open order** (1+ orders not `paid`): `StatusBadge` of the **most recent** open
    order. If more than one open order: after the badge, `spacing[2]` +
    `"+1 more"` / `"+2 more"` `fontSize.xs` `colors.textMuted`. Card bg
    `colors.primarySoft`, border 1 `colors.primary` at full strength — a busy table
    reads at a glance.
- Pressed: bg `colors.surfaceMuted` (free) / border 2 `colors.primary` (open).
- `accessibilityLabel`: `"Table 4, 4 seats, free"` / `"Table 4, 4 seats, open order,
  status Sent"`.

## OrderCard

One order in My orders.

- Container: bg `colors.surface`, radius `radius.lg`, border 1 `colors.border`,
  `shadows.sm`, padding `spacing[4]`.
- Row 1 (space-between, centered): left `"Table 4"` `fontSize.lg` / `lineHeight.lg`
  `fontWeight.bold`; right `StatusBadge` size `large`.
- Row 2 (`spacing[1]` below): `"Order #12 · 10:42"` `fontSize.sm` `colors.textSubtle`,
  tabular nums. (`#` + `orders.id`.)
- Divider: 1 `colors.border`, margin vertical `spacing[3]`.
- Lines: one per order item, `spacing[1]` apart:
  - Left: `"2 × Beef Tibs"` `fontSize.md` `colors.text`, flex 1, wraps.
  - Right: line total `formatEtb(quantity * unit_price_etb)` `fontSize.md`
    `colors.textMuted`, tabular nums.
  - If the line has a note: below the name, `"“no onion”"` (curly quotes)
    `fontSize.sm` `colors.textMuted`, italic not used (Ge'ez has no italics).
  - More than 4 lines: show 3, then `"+2 more items"` `fontSize.sm` `colors.textMuted`.
    Not tappable in this slice.
- Footer (`spacing[3]` below lines): `"Total"` `fontSize.md` `colors.textMuted` left,
  `formatEtb(total)` `fontSize.lg` `fontWeight.bold` `colors.text` right.
- Not tappable in this slice (served/paid actions come later). No pressed state.

## Banner

Inline message inside a screen (not a toast).

- Row: padding `spacing[3]` vertical, `spacing[4]` horizontal; radius `radius.md`;
  gap `spacing[3]`; icon `size.icon` aligned to the first line of text.
- `error`: bg `colors.dangerSoft`, icon `alert-circle` `colors.danger`, text
  `fontSize.sm` / `lineHeight.sm` `colors.text`; optional title line above in
  `fontWeight.semibold` `colors.danger`.
- `info`: bg `colors.surfaceMuted`, icon `information-circle-outline`
  `colors.textMuted`, text `colors.text`.
- Optional action at the end: `ghost` button (not full width), e.g. `"Retry"`.
- `accessibilityRole="alert"` for `error` (screen reader announces it).

## EmptyState

Centered block for empty lists and full-screen errors.

- Icon circle: `size.heroCircle` square, `radius.full`, bg `colors.surfaceMuted`, icon
  `size.iconXl` `colors.textMuted` (screen picks the icon).
- `spacing[4]`, title `fontSize.xl` / `lineHeight.xl` `fontWeight.bold` `colors.text`,
  centered.
- `spacing[2]`, body `fontSize.md` / `lineHeight.md` `colors.textMuted`, centered,
  `maxWidth: size.textBlock`.
- `spacing[6]`, optional `Button` (`secondary`, not full width, min width
  `spacing[16] * 3`).
- Error variant: icon `cloud-offline-outline`, circle bg `colors.dangerSoft`, icon
  `colors.danger`.

## Skeleton

Loading placeholder shaped like the content it replaces.

- Blocks with bg `colors.surfaceMuted`, same radius as the real element.
- Pulse: opacity 1 → 0.55 → 1, 1000 ms loop (`Animated.loop`, native driver).
- Screens say how many and which shape.
- `accessibilityLabel="Loading"` on the container; children `accessible={false}`.

## TabBar (waiter home)

Bottom tabs for the two waiter home screens: **Tables** and **My orders**. Use Expo
Router `Tabs` with these options (no extra package).

- Height `touch.minTarget + spacing[3] * 2` (72) + `insets.bottom`. bg `colors.surface`,
  top border 1 `colors.border`, `shadows.none`.
- Each tab: icon `size.iconLg` above label `fontSize.xs` / `lineHeight.xs`
  `fontWeight.semibold`, gap `spacing[1]`.
  - Active: icon + label `colors.primary`; a pill behind the icon, `spacing[8]` high ×
    `spacing[16]` wide, radius `radius.full`, bg `colors.primarySoft`.
  - Inactive: `colors.textMuted`, no pill.
- Tabs: `"Tables"` icon `grid-outline` (active `grid`); `"My orders"` icon
  `receipt-outline` (active `receipt`).
- My orders tab shows a count bubble when the waiter has orders with status `ready`
  — **slice 3** (needs live updates). Not in this slice.
- Hidden on Menu and Cart (they are pushed stack screens above the tabs).
