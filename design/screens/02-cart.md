# 02 — Cart / review

Route: `/table/[tableId]/cart` — pushed from Menu's CartBar (no tab bar).

## Purpose

Check the order before it goes to the kitchen: items, quantities, a note per item, the
total in ETB — then one big **Send to kitchen** in the thumb zone. Sending must feel
certain: clear progress, a confident success screen, and an honest error with retry.

Demo check: Beef Tibs ×2 (650) + Macchiato ×1 (70) → total **1,370 ETB**.

## Data

Everything comes from the draft order (see `02-menu.md`): lines with name, price,
category sort order, quantity, note. Nothing is fetched on open.

Send = `supabase.rpc('place_order', { p_table_id, p_items })` with
`p_items = [{ menu_item_id, quantity, note }]` (shape as defined in
`supabase/migrations/20261018130100_place_order.sql`; note is `''` when empty, trimmed).
Returns the new order id. The RPC allows quantity 1–99 and notes up to 200 chars; this
screen caps notes at 120, so the UI never hits the server limits.

**Mapping RPC errors** (PostgREST returns `code` = Postgres errcode and `message`):

| Error | Detect | State |
|---|---|---|
| Item unavailable | `code === '22023'` and `message` matches `/^Menu item (\d+) is not available$/` — map the id to the draft line's name | Item unavailable |
| Item deleted | `/^Menu item (\d+) does not exist$/` | Item unavailable (same copy) |
| Not allowed | `code === '42501'`, or HTTP 401 / JWT expired | Session expired |
| No network / timeout / HTTP 5xx | fetch rejects, 15 s timeout, status ≥ 500 | Network |
| Anything else | — | Other |

Matching on the message text is fragile; see open question 1 in the report — if backend
adds a dedicated errcode or a `hint` with the item id, switch to that.

## Layout, top → bottom

1. **`TopBar` `stack`**
   - Title `"Review order"`.
   - Subtitle `"Table 4 · 3 items"` (`"Table {number} · {count}"`).
   - Right: `ghost` button `"Add more"` (icon `add`) → back to Menu (draft kept).
2. **Line list** — `ScrollView`, gutter `spacing[4]`, top padding `spacing[4]`. One card
   holds all lines:
   - Card: bg `colors.surface`, radius `radius.lg`, border 1 `colors.border`,
     `shadows.sm`. Lines separated by a 1 `colors.border` divider inset `spacing[4]`.
   - **Line** (padding `spacing[4]`):
     - Row A: `ItemTile` `small` (category tint + monogram) — `spacing[3]` — column
       (flex 1):
       - name `fontSize.md` / `lineHeight.md` `fontWeight.semibold` `colors.text`, wraps;
       - `"650 ETB each"` `fontSize.sm` `colors.textMuted` (`"{price} each"`).
       Right side of row A: line total `formatEtb(qty × price)` `fontSize.md`
       `fontWeight.bold` `colors.text`, tabular nums, top-aligned with the name.
     - Row B (`spacing[3]` below, indented to align with the name — i.e. left margin
       `size.tileSm + spacing[3]`): space-between
       - left: **Note control** (below);
       - right: `QuantityStepper`.
     - **Note control**
       - No note, not editing: `ghost` button (not full width, `touch.minTarget` high,
         padding horizontal `spacing[2]`, aligned left with no extra left inset), icon
         `create-outline` `size.icon` + `"Add note"`, `colors.primary`.
       - Editing or has note: Row B shows only the stepper on the right; under Row B
         (`spacing[3]` gap, same left indent), a multiline `TextField` without a
         visible label (`accessibilityLabel="Note for {item}"`), placeholder
         `"Note for the kitchen, e.g. no onion"`, `maxLength={120}`,
         `returnKeyType="done"`, `blurOnSubmit`. Autofocus when opened by tapping
         "Add note".
       - Character count appears only from 100 chars: `"{n}/120"` `fontSize.xs`
         `colors.textSubtle` right-aligned under the field.
       - Blurring an empty note returns to the "Add note" button.
3. **Summary** (inside the scroll, `spacing[4]` under the card), padding horizontal
   `spacing[1]`:
   - Row: `"Items"` `fontSize.md` `colors.textMuted` / `"3"` right `colors.text`.
   - No tax/service lines (out of scope; never invent them).
4. Spacer for the bottom panel (its height + `spacing[4]`).
5. **Bottom panel** — fixed to the bottom (thumb zone), outside the scroll:
   - bg `colors.surface`, top border 1 `colors.border`, `shadows.lg`, top corners
     `radius.xl`; padding `spacing[4]` sides, `spacing[4]` top,
     `insets.bottom + spacing[4]` bottom.
   - **Error banner slot** — `Banner` `error` when the last send failed; then `spacing[3]`.
   - **Total row** (space-between, baseline-aligned):
     - `"Total"` `fontSize.lg` / `lineHeight.lg` `fontWeight.semibold` `colors.text`;
     - `formatEtb(total)` — `"1,370 ETB"` — `fontSize['2xl']` / `lineHeight['2xl']`
       `fontWeight.bold` `colors.text`, tabular nums.
   - `spacing[4]`, `Button` `primary` full width, icon `paper-plane` +
     `"Send to kitchen"`.

The panel moves up with the keyboard while a note is being typed
(`KeyboardAvoidingView`); while the keyboard is open, hide the Total row and button
(`Keyboard` listeners) so the note field and the line it belongs to stay visible.
They return when the keyboard closes.

## Behaviour

- **Stepper** — same as Menu. Removing the last unit of a line (trash) removes the line
  immediately; no confirm (it's one tap to add back from Menu).
- **Add more** / back → Menu with the draft intact. Back is **not** blocked here.
- **Send to kitchen**:
  1. `Keyboard.dismiss()`; trim notes.
  2. Enter **Sending**.
  3. Call `place_order`. Timeout 15 s → treat as network error.
  4. Success → **Sent** state; clear the draft.
  5. Failure → **Error** state (draft untouched, so retry sends the same thing).
- While Sending: back (button, Android back, swipe) is blocked — ignore it.

## States

| State | What shows |
|---|---|
| **Default** | As above. |
| **Editing note** | Field focused (border `colors.focusRing`), keyboard open, bottom panel's total + button hidden. |
| **Sending** | Button loading: spinner + `"Sending…"`. Steppers, note fields, Add note, Add more, back: all disabled (steppers use their disabled style). Line card at `opacity: 0.6`. |
| **Sent (success)** | Replaces the whole screen (same route, no top bar back arrow). See below. |
| **Error — network / timeout / 5xx** | Banner: title `"Couldn't send the order"`, body `"Check your connection and try again. Nothing was sent to the kitchen."` Button label becomes `"Try again"` (icon `refresh`). |
| **Error — item unavailable** (see mapping above) | Banner: title `"{item} is no longer available"`, body `"Remove it, then send again."` The matching line gets a 2 `colors.danger` left border + `"Not available"` `fontSize.sm` `colors.danger` under its name. Button stays `"Send to kitchen"`. |
| **Error — session expired** (401 / JWT) | Banner: title `"You've been signed out"`, body `"Sign in again to send this order."`, banner action `"Sign in"` → Login. (Draft is lost; acceptable for the demo.) |
| **Error — other** (RPC raised something unexpected) | Banner: title `"Couldn't send the order"`, body `"Something went wrong on our side. Try again."` |
| **Empty** (all lines removed) | Bottom panel hidden. Centered `EmptyState`, icon `receipt-outline`: title `"No items yet"`, body `"Add something from the menu."`, button `"Back to menu"` → Menu. |

Error banners clear when the waiter changes anything or taps Send again.

"Nothing was sent to the kitchen" is only true if the request never reached the
server. See open question on duplicate sends after a timeout.

## Sent (success) state

Full screen, bg `colors.background`, gutter `spacing[4]`.

1. Top spacer `insets.top + spacing[6]`.
2. Centered block (`flex: 1`, vertically centered):
   - Circle `size.heroCircle`, radius `radius.full`, bg `colors.successSoft`; inside
     `checkmark` `size.iconXl` `colors.success`. Entrance: scale 0.6 → 1 + fade, 200 ms
     (`Animated`, native driver). No confetti.
   - `spacing[5]`, `"Sent to kitchen"` `fontSize['2xl']` / `lineHeight['2xl']`
     `fontWeight.bold` `colors.text`.
   - `spacing[2]`, `"Table 4 · Order #12"` `fontSize.md` `colors.textMuted`
     (`"Table {number} · Order #{id}"`).
   - `spacing[5]`, a receipt card, `maxWidth: size.textBlock`, full width up to that:
     bg `colors.surface`, radius `radius.lg`, border 1 `colors.border`, padding
     `spacing[4]`:
     - each line `"2 × Beef Tibs"` left / line total right, `fontSize.sm`
       `colors.text`, `spacing[1]` apart (notes not repeated here);
     - divider 1 `colors.border`, `spacing[3]` margin;
     - `"Total"` left `fontSize.md` `fontWeight.semibold` / `"1,370 ETB"` right
       `fontSize.md` `fontWeight.bold`.
   - `spacing[4]`, `StatusBadge` `sent` + `spacing[2]` + `"The cook can see it now."`
     `fontSize.sm` `colors.textMuted` (row, centered).
3. Bottom actions (thumb zone), padding bottom `insets.bottom + spacing[4]`:
   - `Button` `primary` `"Back to tables"` → `router.dismissTo` / `dismissAll` back to
     the Tables tab (Menu and Cart leave the stack). Tables refetches on focus and
     shows Table 4 as open.
   - `spacing[3]`, `Button` `secondary` `"View my orders"` → dismiss the stack, then
     switch to the My orders tab.
- Android back / swipe-back here = **Back to tables**.
- No auto-dismiss timer: the client should see the success screen as long as the
  presenter wants.

## Copy (all strings)

- `"Review order"`, `"Table {number} · {count}"`, `"Add more"`
- `"{price} each"`, `"Add note"`, `"Note for {item}"`,
  `"Note for the kitchen, e.g. no onion"`, `"{n}/120"`
- `"Items"`, `"Total"`
- `"Send to kitchen"`, `"Sending…"`, `"Try again"`
- `"Couldn't send the order"`,
  `"Check your connection and try again. Nothing was sent to the kitchen."`
- `"{item} is no longer available"`, `"Remove it, then send again."`, `"Not available"`
- `"You've been signed out"`, `"Sign in again to send this order."`, `"Sign in"`
- `"Something went wrong on our side. Try again."`
- `"No items yet"`, `"Add something from the menu."`, `"Back to menu"`
- `"Sent to kitchen"`, `"Table {number} · Order #{id}"`, `"{qty} × {item}"`,
  `"The cook can see it now."`, `"Back to tables"`, `"View my orders"`
