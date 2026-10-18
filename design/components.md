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
- **Slice 3:** ready / served / paid variants and the action button. See
  "OrderCard — live variants" below.

## Banner

Inline message inside a screen (not a toast).

- Row: padding `spacing[3]` vertical, `spacing[4]` horizontal; radius `radius.md`;
  gap `spacing[3]`; icon `size.icon` aligned to the first line of text.
- `error`: bg `colors.dangerSoft`, icon `alert-circle` `colors.danger`, text
  `fontSize.sm` / `lineHeight.sm` `colors.text`; optional title line above in
  `fontWeight.semibold` `colors.danger`.
- `info`: bg `colors.surfaceMuted`, icon `information-circle-outline`
  `colors.textMuted`, text `colors.text`.
- `success` (slice 3): bg `colors.successSoft`, icon `checkmark-circle`
  `colors.success`, text `colors.text`. `accessibilityRole="alert"` too.
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
  (slice 3). Spec: `screens/03-waiter-live.md` → Tab bar.
- Hidden on Menu and Cart (they are pushed stack screens above the tabs).

---

# Slice 3 components

Kitchen board (`screens/03-kitchen.md`) and waiter live updates
(`screens/03-waiter-live.md`). Same global rules as above. The kitchen uses bigger type
because it is read from a metre away.

## StatusSolidButton (kitchen action)

A big button that moves an order into a status. It is coloured with that status's solid
colour, so the button matches the lane the ticket is about to join.

- Height `touch.kitchenAction` (72), full width, radius `radius.lg`, `shadows.md`.
- bg `statusSolid[target].bg`; pressed bg `statusSolid[target].pressed`. Label and icon
  `statusSolid[target].fg`.
- Leading icon `size.iconLg` + `spacing[3]` + label `fontSize.xl` / `lineHeight.xl`
  `fontWeight.bold`.
- **Loading:** `ActivityIndicator` (`size="small"`, fg colour) + `spacing[3]` + loading
  label. Same size and colours, not pressable.
- **Disabled** (rare: only while that ticket's own request is in flight, which is
  loading): no separate look.
- Contrast: white on every `statusSolid` bg and pressed shade is ≥ 6.56:1.

## HighlightRing

The "look here" ring for something that just arrived (a new kitchen ticket, or a waiter's
order that just turned ready).

- Absolutely positioned over its child: `top/left/right/bottom: -size.ringWidth`,
  `borderWidth: size.ringWidth`, `borderRadius: radius.lg + size.ringWidth`,
  `pointerEvents="none"`.
- Colour given by the screen: kitchen `statusColors.sent.fg`, waiter `colors.success`.
- Animation (`Animated`, native driver, on `opacity`): 1 for `timing.newTicketHoldMs`,
  then to 0 over `timing.newTicketFadeMs`, then unmount. Starts on mount.
- The parent must leave `size.ringWidth` of room around the child (lane / list padding
  does).

## ConnectionPill (kitchen top bar)

- Row, height `spacing[10]` (40), padding horizontal `spacing[4]`, radius `radius.full`,
  gap `spacing[2]`. Label `fontSize.md` / `lineHeight.md` `fontWeight.semibold`.
- Four states (colours and labels): see `03-kitchen.md` → Connection states. Every
  state has a word, never only a colour.
- Leading: a dot (`spacing[2]` square, `radius.full`), an `ActivityIndicator`
  `size="small"`, or an Ionicon `size.icon`, depending on the state.
- Not tappable. `accessibilityLabel` `"Connection: Live"`. Use
  `accessibilityLiveRegion="polite"` so a change is announced.

## KitchenLane

One column of the board.

- Container: bg `colors.surfaceMuted`, radius `radius.xl`, `overflow: 'hidden'`,
  top border `size.laneEdge` (6) in `statusColors[status].fg`.
- **Header:** padding horizontal `spacing[4]`, vertical `spacing[3]`, row,
  space-between.
  - Left: icon `size.iconLg` + `spacing[2]` + label `fontSize.xl` / `lineHeight.xl`
    `fontWeight.bold`, both `statusColors[status].fg` (on the cream100 lane fill: blue
    7.09, amber 5.80, green 5.60).
  - Right: count chip. Min width and height `spacing[10]`, padding horizontal
    `spacing[3]`, radius `radius.full`, bg `statusColors[status].bg`, number
    `fontSize.lg` / `lineHeight.lg` bold `statusColors[status].fg`, tabular nums,
    centred.
  - The header is one accessible element: `"New, 2 orders"`.
- **Body:** `FlatList`, `contentContainerStyle` padding horizontal `spacing[3]`, top
  `spacing[1]`, bottom `spacing[3]`, gap `spacing[3]`. The padding also gives
  `HighlightRing` its room.
- **Lane empty:** the text given by the screen, `fontSize.lg` / `lineHeight.lg`
  `colors.textMuted`, centred, padding `spacing[6]`.

## KitchenTicket

A ticket in the New or Preparing lane.

```
┌──────────────────────────────────────┐
│ Table 4  [NEW]            ⏱  4 min   │  band: statusColors[status].bg
│ ✈ New                                │
├──────────────────────────────────────┤
│ #12 · Hana Tesfaye · 14:01           │  meta
│ ──────────────────────────────────── │
│ 2×  Beef Tibs                        │
│     ┃ “no onion”                     │  note block
│ 1×  Macchiato                        │
│ [ 🔥       Start preparing          ] │  StatusSolidButton
└──────────────────────────────────────┘
```

- **Container:** bg `colors.surface`, radius `radius.lg`, border 1 `colors.border`,
  `shadows.md`, `overflow: 'hidden'` (wrap it in a View that does **not** clip, so
  `HighlightRing` can sit outside it).
  - **Late:** border 3 `colors.overdue`.
- **Header band:** bg `statusColors[status].bg`, padding vertical `spacing[3]`,
  horizontal `spacing[5]`. Row, space-between, items start.
  - Left column:
    - Row: `"Table 4"` `fontSize['4xl']` / `lineHeight['4xl']` `fontWeight.bold`
      `colors.text` (13.9:1 on blue50, 14.3:1 on amber50), tabular nums. Optional `"NEW"`
      tag after it (spec in `03-kitchen.md`).
    - Status word: icon `size.icon` + `spacing[1]` + `"New"` / `"Preparing"`
      `fontSize.md` / `lineHeight.md` `fontWeight.semibold` `statusColors[status].fg`.
  - Right: **timer**, vertically centred on the table number.
    - Normal: icon `time-outline` `size.iconLg` `colors.text` + `spacing[2]` + `"4 min"`
      `fontSize['2xl']` / `lineHeight['2xl']` `fontWeight.bold` `colors.text`, tabular
      nums.
    - Late: a chip, bg `colors.overdue`, padding `spacing[1]` × `spacing[3]`, radius
      `radius.full`, icon `alert-circle` + `"12 min · Late"`, same type,
      `colors.textOnOverdue`.
- **Meta:** padding horizontal `spacing[5]`, top `spacing[3]`. `"#12 · Hana Tesfaye ·
  14:01"` `fontSize.lg` / `lineHeight.lg` `colors.textMuted`, tabular nums,
  `numberOfLines={1}`. The time is when the order was sent (`HH:mm`).
- **Divider:** 1 `colors.border`, margin `spacing[3]` vertical, `spacing[5]` horizontal.
- **Items:** padding horizontal `spacing[5]`, gap `spacing[3]`. Each line is a row:
  - Quantity `"2×"` `fontSize['2xl']` / `lineHeight['2xl']` `fontWeight.bold`
    `colors.text`, min width `spacing[12]`, tabular nums.
  - `spacing[2]`, then a column, flex 1:
    - Name `fontSize['2xl']` / `lineHeight['2xl']` `fontWeight.semibold` `colors.text`.
      It wraps and is never truncated.
    - Note, if any: `spacing[1]` below. A block with bg `colors.surfaceMuted`, left
      border 4 `colors.borderControl`, radius `radius.sm`, padding `spacing[2]` ×
      `spacing[3]`. Text `"“no onion”"` `fontSize.xl` / `lineHeight.xl`
      `fontWeight.medium` `colors.text`.
  - Every line is shown (no "+n more").
- **Error** (action failed): `Banner` `error`, margin horizontal `spacing[5]`, top
  `spacing[4]`.
- **Action:** `StatusSolidButton`, margin `spacing[4]` top, `spacing[5]` sides and
  bottom.
- **Enter / leave:** fade + slide `timing.enterMs` (see `03-kitchen.md`).

## ReadyTicket

A compact ticket in the Ready lane. It has no action (the waiter picks it up).

- Container: bg `colors.surface`, radius `radius.lg`, border 2 `statusColors.ready.fg`,
  `shadows.sm`, padding `spacing[4]`, gap `spacing[1]`.
- Row 1 (space-between, centred): `"Table 6"` `fontSize['2xl']` / `lineHeight['2xl']`
  bold `colors.text`; `StatusBadge` `ready` `large`.
- Row 2: `"3 items · Hana Tesfaye"` `fontSize.lg` / `lineHeight.lg`
  `colors.textMuted`, `numberOfLines={1}`.
- Row 3: `"Waiting for pickup"` `fontSize.md` / `lineHeight.md` `fontWeight.medium`
  `colors.success`.
- Leaves with a fade (`timing.enterMs`) when the order becomes `served`.

## OrderCard — live variants (waiter, slice 3)

Adds to the OrderCard above. The rules per status are in `03-waiter-live.md`.

- **ready:** border 2 `colors.success`. **Pickup band** as the card's first child,
  bleeding to the card edges: margin `-spacing[4]` top and sides, `spacing[3]` bottom,
  top corners `radius.lg - 2` (inside the border). bg `colors.successSoft`, padding
  `spacing[2]` × `spacing[4]`, row: `checkmark-circle` `size.icon` `colors.success` +
  `spacing[2]` + `"Ready — pick up"` `fontSize.md` bold `colors.success`. It can carry a
  `HighlightRing` in `colors.success`.
- **served:** unchanged look.
- **paid:** bg `colors.surfaceMuted`, `shadows.none`, border 1 `colors.border`. A
  `"Paid with Telebirr"` line under the total.
- **Action** (ready → `"Mark served"`, served → `"Mark paid"`): a `primary` `Button`,
  full width, `spacing[4]` below the total row. An error `Banner` goes `spacing[3]`
  above it when the action failed.

## TableCard — ready variant (waiter, slice 3)

bg `colors.successSoft`, border 2 `colors.success`, bottom `StatusBadge` `ready`.
Pressed: border 3. See `03-waiter-live.md`.

## PaymentOption

One row in the PaymentSheet (`03-waiter-live.md`).

- `Pressable`, min height `spacing[16]` (64), radius `radius.lg`, padding horizontal
  `spacing[4]`, row, centred, gap `spacing[3]`.
- Default: bg `colors.surface`, border 1.5 `colors.borderControl`. Pressed: bg
  `colors.surfaceMuted`.
- **Selected:** bg `colors.primarySoft`, border 2 `colors.primary`.
- Left: icon circle `size.tileSm` (48), `radius.full`, bg `colors.surfaceMuted`
  (selected: `colors.surface`), icon `size.iconLg` `colors.text`.
- Label `fontSize.lg` / `lineHeight.lg` `fontWeight.semibold` `colors.text`, flex 1.
- Right: `radio-button-off` `size.iconLg` `colors.textMuted`. Selected:
  `radio-button-on` `colors.primary`.
- Disabled while saving: opacity stays, not pressable.
- a11y: role `radio`, `accessibilityState={{ checked, disabled }}`, label = the label.

---

# Slice 4 — website components (owner / manager)

The owner website (Next.js + Tailwind v4). Class names come from `design/tokens.css`;
see `web-tailwind.md` for the mapping (`colors.textMuted` → `text-text-muted`,
`spacing[4]` → `p-4`, `size.sidebar` → `w-sidebar`). Screens:
`screens/04-web-shell.md`, `screens/04-stock.md`.

## Web global rules

- **Mouse and keyboard first, touch still works.** Hover = the mobile "pressed" colour.
  Every interactive element has a visible `:focus-visible` outline: 2 px
  `focus-ring`, offset 2 (set once in `globals.css`, see `web-tailwind.md`). Never
  `outline-none` without a replacement.
- **Sizes:** controls are `h-12` (48) by default, `h-10` (40) for the small in-row
  variant on laptop only. Below `md` every control is at least `h-12`.
- **Numbers:** every quantity, count and time uses `tabular-nums`.
- **Strings:** one file, `web/src/lib/strings.ts`. English text exactly as written in
  the screen specs.
- **Times** are shown in Addis Ababa time on server *and* client:
  `new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: 'Africa/Addis_Ababa' })`.
  The server renders in UTC otherwise and the times would be 3 hours off.
- **Motion:** every transition listed here is wrapped so `motion-reduce:` removes it
  (`motion-reduce:transition-none motion-reduce:animate-none`). Colours still change.
- **Icons:** Ionicons v7 outline SVGs, inlined as small React components in
  `web/src/components/icons.tsx` (no package). Copy each `<path>` from
  `https://unpkg.com/ionicons@7.4.0/dist/svg/<name>.svg`. Icons take
  `className` (size + colour via `currentColor`) and are `aria-hidden="true"`.
  Names used this slice: `stats-chart-outline`, `cube-outline`, `restaurant-outline`,
  `log-out-outline`, `menu-outline`, `close`, `add`, `search-outline`,
  `warning-outline`, `alert-circle`, `checkmark-circle`, `cloud-offline-outline`,
  `time-outline`, `chevron-down`, `receipt-outline`, `add-circle-outline`,
  `phone-portrait-outline`, `flame-outline`, `person-circle-outline`,
  `eye-outline`, `eye-off-outline`.

## Formatting helpers (`web/src/lib/format.ts`)

Units are always the ingredient's own unit from the database. **Never convert** (no
"250 g"): the threshold, the stock and the Add stock amount must read in the same unit,
and deliveries arrive by the kilo.

| Function | Rule | Examples |
|---|---|---|
| `formatQuantity(n, unit)` | `kg`/`L`: round to 2 decimals, drop trailing zeros. `pcs`: round to whole. Thousands `,`. A no-break space (U+00A0) before the unit. | `5.3 → "5.3 kg"`, `4.8 → "4.8 kg"`, `14.8 → "14.8 kg"`, `3 → "3 kg"`, `5.982 → "5.98 kg"`, `0.5 → "0.5 kg"`, `20 → "20 L"`, `120 → "120 pcs"`, `1250 → "1,250 pcs"`, `0 → "0 kg"` |
| `formatDelta(n, unit)` | Sign first: `+` or `−` (U+2212, not a hyphen). `kg`/`L`: up to **3** decimals (recipe amounts are small), drop trailing zeros. | `10 → "+10 kg"`, `-0.5 → "−0.5 kg"`, `-0.018 → "−0.018 kg"`, `-4 → "−4 pcs"`, `-0.1 → "−0.1 L"` |
| `unitWord(unit)` | For helper text. | `kg → "kg"`, `L → "litres"`, `pcs → "pieces"` |
| `formatTime(iso)` | `HH:mm`, Addis time (above). Today → `"14:02"`; yesterday → `"Yesterday 14:02"`; older → `"12 Oct 14:02"`. | |

Implementation hint (avoid float noise): `Number(n.toFixed(2)).toString()` then add
thousands separators to the integer part. `Intl.NumberFormat('en-US', { maximumFractionDigits: 2 })` is fine on the web too.

**Low stock** is decided on raw numbers, never the rounded text:
`isLow = quantity_on_hand < low_stock_threshold` (strictly below — at the threshold is not low); **Out** when
`quantity_on_hand <= 0`. (If the backend exposes its own `is_low`, use that instead —
same rule.)

## Button (web)

Same variants and colours as the mobile Button, plus web sizes and hover.

| Size | Height | Padding x | Label |
|---|---|---|---|
| `lg` | `h-primary-action` (56) | `px-6` | `text-lg font-semibold` — login submit only |
| `md` (default) | `h-12` | `px-5` | `text-md font-semibold` |
| `sm` | `h-10` (≥ `md` breakpoint only; `h-12` below) | `px-4` | `text-sm font-semibold` |

- `primary`: `bg-primary text-text-on-primary shadow-md hover:bg-primary-pressed rounded-lg`.
- `secondary`: `bg-surface text-text border-[1.5px] border-border-control hover:bg-surface-muted rounded-lg`.
- `ghost`: `bg-transparent text-primary hover:bg-primary-soft rounded-md`.
- Icon: `size-icon` (sm: `size-icon-sm`), `gap-2`.
- **Loading:** a CSS spinner (`size-icon-sm rounded-full border-2 border-current
  border-r-transparent animate-spin`) + `gap-2` + the loading label. Width must not
  change: give the button `min-w` equal to its default width or keep the label the
  same length. `aria-busy="true"`, `disabled`.
- **Disabled:** `bg-surface-muted text-text-subtle border-[1.5px] border-border shadow-none cursor-not-allowed`.
- `cursor-pointer` on enabled buttons (Tailwind v4 preflight sets `default`).

## TextField / Select / Search (web)

- Label: `text-sm font-semibold text-text mb-2`, a real `<label htmlFor>`.
- Box: `h-12 w-full rounded-md bg-surface px-4 text-md text-text border-[1.5px]
  border-border-control placeholder:text-text-subtle`.
- **Hover:** `border-text-muted`. **Focus:** `border-2 border-focus-ring` with
  `px-[15.5px]` so text doesn't shift, no outline (the border is the ring).
- **Error:** `border-2 border-danger`, `aria-invalid="true"`,
  `aria-describedby` → the message row under it: `mt-2 flex gap-1 text-sm text-danger`
  with `alert-circle` `size-icon-sm`.
- **Helper text** (when no error): `mt-2 text-sm text-text-muted`.
- **Disabled:** `bg-surface-muted text-text-muted border-border`.
- **Unit suffix** (Amount field): the unit sits inside the box on the right,
  `text-md font-semibold text-text-muted`, `pr-4`; the input gets `pr-16` so digits
  never run under it. The suffix is `aria-hidden`; the unit is in the helper text.
- **Select:** native `<select>`, same box, `appearance-none pr-12`, a `chevron-down`
  `size-icon text-text-muted` absolutely placed `right-4`, `pointer-events-none`.
- **Search:** same box with a leading `search-outline` `size-icon text-text-muted`
  at `left-4`, input `pl-12`. When it has text, a trailing clear button (`close`,
  `size-10` hit area, `aria-label="Clear search"`) at `right-1`. `type="search"`.
- **Password:** trailing show/hide button as on mobile, `aria-label` `"Show password"` /
  `"Hide password"`.

## Avatar

`size-avatar rounded-full bg-surface-muted text-text-muted text-sm font-bold`,
initials centred (first letter of the first two words of `full_name`, uppercase:
`"Abebe Kebede" → "AK"`). Empty name → `person-circle-outline` `size-icon-lg`.
`aria-hidden` (the name is printed next to it).

## NavItem

A link in the sidebar / nav drawer.

- `h-12 flex items-center gap-3 px-3 rounded-md text-md font-medium`.
- Default: `text-text-muted`, icon `size-icon text-text-muted`. Hover:
  `bg-surface-muted text-text`.
- **Active** (current route, `aria-current="page"`): `bg-primary-soft text-primary
  font-semibold`, icon `text-primary` (5.23:1).
- Optional trailing **count chip** (`ml-auto`): `min-w-6 h-6 px-2 rounded-full
  bg-status-low-stock-bg text-status-low-stock-fg text-xs font-bold tabular-nums`,
  centred. Screen reader text: `"1 low"` via `sr-only` after the number.

## StatusChip (stock)

The flag on a low row. **Icon + word + colour, always together.**

| State | Label | Icon | Classes |
|---|---|---|---|
| Low | `"Low"` | `warning-outline` | `bg-status-low-stock-bg text-status-low-stock-fg` |
| Out | `"Out"` | `alert-circle` | `bg-danger text-text-on-overdue` (7.50:1) |
| OK | nothing visible | — | `sr-only` text `"In stock"` |

Shape: `inline-flex items-center gap-1 py-1 px-3 rounded-full text-sm font-semibold`,
icon `size-icon-sm`. (Only the flags get colour, so the eye lands on them.)

## LevelBar

Shows how much is on hand against the low level.

```
       tick (low level, always at 1/6 = 16.7%)
       │
[██████│█░░░░░░░░░░░░░░░░░░░░░░░░░░░░░]   Beef 5.3 kg, low at 5 → 17.7%, coffee fill
[█████▌│░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░]   Beef 4.8 kg → 16%, fill turns red
[██████│███████████░░░░░░░░░░░░░░░░░░░]   Beef 14.8 kg → 49%
```

- Container: `relative h-level-tick` (16, gives the tick room) `w-full`, flex
  centred vertically. `aria-hidden="true"` — the number and chip carry the meaning.
- Track: `h-level-bar w-full rounded-full bg-level-track overflow-hidden`.
- Fill: `h-full rounded-full bg-level-fill` (low/out: `bg-level-fill-low`),
  `style={{ width: pct + '%' }}`, `transition-[width] duration-400 ease-out`
  (`motion-reduce:transition-none`)
  (`timing.levelBarMs`).
  `pct = min(q / (threshold × stockLevel.barScale), 1) × 100`; if `q > 0` use at
  least 2 so a nearly empty bar is still visible; `q <= 0` → 0; threshold 0 → 100 and no tick.
- Tick: `absolute top-0 h-level-tick w-level-tick-width rounded-full bg-level-tick`,
  `left: 100 / stockLevel.barScale + '%'` (16.7%), `-translate-x-1/2`. It is taller than
  the track so it shows above and below the fill.

## StatTile

A number card at the top of a page.

- `rounded-xl bg-surface border border-border shadow-sm p-5 flex flex-col gap-1`,
  text left-aligned.
- Label row: icon `size-icon text-text-muted` + `gap-2` + label `text-sm font-semibold
  text-text-muted`.
- Value: `text-3xl font-bold text-text tabular-nums` (`mt-1`).
- Caption: `text-sm text-text-muted`, 1–2 lines, `line-clamp-2`.
- **Alert variant:** `bg-status-low-stock-bg border-status-low-stock-fg/30`; label,
  icon and value `text-status-low-stock-fg`; caption `text-text` (13.31:1).
- **As a button** (Low stock tile): a `<button>` with `aria-pressed`, `hover:shadow-md`,
  and when pressed `ring-2 ring-status-low-stock-fg ring-offset-2 ring-offset-background`.
- **Flash** (value changed live): see the screen.

## LivePill (web ConnectionPill)

Same four states, colours and words as the kitchen `ConnectionPill`
(`03-kitchen.md` → Connection states): Connecting… / Live / Reconnecting… / Offline.
Web size: `h-10 px-4 rounded-full gap-2 text-sm font-semibold`, dot `size-2
rounded-full`, spinner as in Button loading, icon `size-icon-sm`. `role="status"`
(polite). Not interactive.

## Toast

One at a time, for the result of an action the user just took (never for live events).

- Position: `fixed z-50 bottom-6 right-6 w-drawer max-w-[calc(100vw-2rem)]`; below
  `md`: `bottom-4 inset-x-4 w-auto` (above the sticky action bar if the page has one —
  the page says).
- `bg-surface border border-border rounded-lg shadow-lg p-4 flex items-start gap-3`.
- Icon `checkmark-circle size-icon-lg text-success` (error variant: `alert-circle
  text-danger`).
- Title `text-md font-semibold text-text`; body `text-sm text-text-muted`.
- Close button (`close`, `size-10`, `aria-label="Dismiss"`).
- `role="status"` `aria-live="polite"`. Auto-hides after `timing.toastMs`; the timer
  pauses while hovered or focused. Enters with `translate-y-2 opacity-0` →
  `translate-y-0 opacity-100`, `duration-250`.

## Drawer (side sheet)

Used by Add stock and the phone nav. Built on the native `<dialog>` element with
`showModal()` — it gives the modal backdrop, Esc, and makes the page behind inert.
No library.

- `<dialog>` reset: `m-0 p-0 max-h-none max-w-none bg-transparent`, and
  `backdrop:bg-scrim`.
- **Right drawer (≥ `md`):** panel `fixed inset-y-0 right-0 h-full w-drawer
  bg-surface shadow-lg flex flex-col`. Below `md`: `inset-0 w-full` (full screen).
- **Left drawer** (nav, < `lg`): `inset-y-0 left-0 w-sidebar`.
- Enter: slide from its edge (`translate-x-full` → `0`, left: `-translate-x-full`),
  `duration-250 ease-out` (`timing.enterMs`); backdrop fades in.
- Header: `flex items-start justify-between gap-4 px-6 pt-6 pb-4 border-b border-border`.
  Title `text-xl font-bold` (the `<h2>`, referenced by `aria-labelledby`), optional
  subtitle `text-sm text-text-muted mt-1`. Close button: `close` icon, `size-12`
  round, `hover:bg-surface-muted`, `aria-label="Close"`.
- Body: `flex-1 overflow-y-auto px-6 py-6`.
- Footer (sticky): `px-6 py-4 border-t border-border bg-surface flex gap-3
  justify-end`; below `md` the two buttons share the width (`flex-1` each).
- Clicking the backdrop closes it (unless the drawer says it is busy). Focus returns to
  the element that opened it.

## SegmentedControl

Two or three options, one active (All / Low).

- Group: `inline-flex h-12 p-1 gap-1 rounded-lg bg-surface-muted`,
  `role="group"` with `aria-label`.
- Option: `<button aria-pressed>` `h-10 px-4 rounded-md text-sm font-semibold
  text-text-muted hover:text-text flex items-center gap-2`.
- Active: `bg-surface text-text shadow-sm`.
- Optional count after the label: `text-text-subtle tabular-nums`; on the Low option,
  when the count is above 0, the count is a chip `min-w-6 h-6 px-2 rounded-full
  bg-status-low-stock-bg text-status-low-stock-fg text-xs font-bold`.

## Banner, EmptyState, Skeleton (web)

Same as the mobile specs above, with classes:

- **Banner:** `flex gap-3 rounded-md px-4 py-3`; `error` `bg-danger-soft`, title
  `text-sm font-semibold text-danger`, body `text-sm text-text`; `role="alert"`.
- **EmptyState:** centred column, circle `size-hero-circle rounded-full
  bg-surface-muted` with icon `size-icon-xl text-text-muted`; title `mt-4 text-xl
  font-bold`; body `mt-2 text-md text-text-muted max-w-text-block`; button `mt-6`.
  Error variant: circle `bg-danger-soft`, icon `text-danger`.
- **Skeleton:** `bg-surface-muted animate-pulse` blocks with the real element's radius.
  Container `aria-busy="true"` with `sr-only` `"Loading"`.
