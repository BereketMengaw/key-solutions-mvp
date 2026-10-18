# 03 — Waiter: live status, pick up, served, paid

Changes to the two waiter home screens for slice 3. The base specs are still
`02-tables.md` and `02-my-orders.md`. This file only says what changes. Where they
disagree, this file wins.

Demo beat: the cook taps **Mark ready**. Within a second the waiter's phone buzzes, the
**My orders** tab shows a green `1`, and the Table 4 card turns green. On My orders the
order sits at the top under a green band that says **"Ready — pick up"**. The waiter
taps **Mark served**, then **Mark paid** → **Telebirr** → **Confirm payment**. Table 4
goes back to **Free**.

## Live data (both screens)

- **One Realtime channel** for the waiter's home, opened in `(waiter)/_layout.tsx` and
  shared by both tabs through context: `postgres_changes` on `orders`, all events, no
  filter. RLS lets staff read every order, and Tables needs every waiter's orders anyway.
- On any event, **refetch** the screen's existing query (the slice 2 queries, unchanged),
  debounced 300 ms. A refetch is simpler and harder to get wrong than patching rows in
  place, and the data is tiny.
- Keep slice 2's refetch on focus and pull to refresh.
- **Ready moment:** when an `UPDATE` arrives with `new.status = ready` and
  `new.waiter_id = auth.uid()`:
  - `Vibration.vibrate(timing.readyVibrateMs)` (React Native core, no package. Check
    that `android.permission.VIBRATE` is in the build).
  - Remember the order id as "just ready" so My orders shows the highlight ring on its
    card (below) when the refetch lands.
  - Nothing happens for other waiters' orders. Table cards just recolour.
- **Connection:** same channel states as the kitchen (`03-kitchen.md`), but quieter.
  There is no pill. If the channel isn't `SUBSCRIBED` for `timing.offlineBannerDelayMs`,
  show a `Banner` `info` at the top of the list on both screens:
  `"Live updates paused. Reconnecting…"`. On `SUBSCRIBED` again: refetch and hide the
  banner. There is no "back online" message on the phone.
- Unsubscribe on sign out. Re-create the channel after a drop (supabase-js retries on
  its own, so just re-subscribe if it reports `CLOSED`).

## Tab bar

- **My orders** tab badge = the number of the waiter's own orders with status `ready`.
  It is hidden at 0. Expo Router `Tabs` options: `tabBarBadge`, and
  `tabBarBadgeStyle: { backgroundColor: colors.success, color: colors.textOnPrimary }`
  with `fontSize.xs` semibold. White on green700 is 6.56:1.
- a11y: `"My orders, 1 ready"` when the badge shows.

## Tables screen changes

- Live via the channel above. The summary line (`"{free} free · {open} with orders"`)
  updates with it.
- **`TableCard` — ready variant** (new). If **any** open order on the table is `ready`,
  the card shows the ready state, even if it isn't the most recent order. Pick-up is the
  thing the waiter must act on.
  - bg `colors.successSoft`, border 2 `colors.success` (instead of the primary-soft
    open look).
  - Bottom: `StatusBadge` `ready` (label `"Ready"`), then `"+{n} more"` as before if the
    table has other open orders.
  - Pressed: bg `colors.successSoft`, border 3 `colors.success`.
  - a11y: `"Table 4, 4 seats, order ready to pick up"`.
- **Freed table:** once its last open order is `paid`, the card goes back to Free (slice 2
  look). Nothing else changes.
- Tapping a card still opens Menu for that table (unchanged).

## My orders screen changes

### Sort

1. `ready` orders, oldest first (the one waiting longest is first in the list).
2. `sent`, `preparing` and `served` orders, newest first.
3. `paid` orders, newest first.

Wrap each data change in `LayoutAnimation.configureNext(easeInEaseOut)` so cards slide
to their new place instead of jumping.

### Summary strip

There are three stat blocks now (each `flex: 1`, gap `spacing[2]`, padding `spacing[3]`):
`"Orders"`, `"Open"`, `"Ready"`. The Ready value uses `colors.success` when it is above 0,
otherwise `colors.text`. The label styles are unchanged.

### OrderCard by status

The slice 2 card is unchanged for `sent` and `preparing`. New variants are below. Full
component spec: `components.md` → OrderCard.

| Status | Card | Action at the bottom |
|---|---|---|
| `sent`, `preparing` | slice 2 card | none (the kitchen's move) |
| `ready` | **pickup band** at top + border 2 `colors.success` | `primary` Button `"Mark served"`, icon `restaurant-outline` |
| `served` | slice 2 card | `primary` Button `"Mark paid"`, icon `wallet-outline` → PaymentSheet |
| `paid` | muted: bg `colors.surfaceMuted`, `shadows.none` | none. Under the total: `"Paid with Telebirr"` |

- **Pickup band** (the "Ready — pick up" highlight): full-bleed across the top of the
  card, bg `colors.successSoft`, padding `spacing[2]` × `spacing[4]`, icon
  `checkmark-circle` `size.icon` `colors.success`, `spacing[2]`, text
  `"Ready — pick up"` `fontSize.md` / `lineHeight.md` `fontWeight.bold`
  `colors.success` (5.65:1). The card keeps its `StatusBadge` too.
- **Just-ready highlight:** if the card's order is in the "just ready" set (from the
  live event), show `HighlightRing` in `colors.success` (same timing as the kitchen:
  hold `timing.newTicketHoldMs`, fade `timing.newTicketFadeMs`). Then remove the id
  from the set. Orders that were already ready on first load get no ring.
- **Mark served:** one tap, no confirm (the order is in the waiter's hand). Button
  loading label `"Saving…"`. **Not optimistic:** the card changes once the update
  returns. Then the band goes, the card moves down (sort) and its button becomes
  "Mark paid".
- **Mark paid:** opens `PaymentSheet` (below). The status changes only on Confirm.
- **Paid line:** `"Paid with {method}"` `fontSize.sm` / `lineHeight.sm`
  `fontWeight.semibold` `statusColors.paid.fg` (6.47:1 on `surfaceMuted`), `spacing[2]`
  under the total row. The method label comes from `orders.payment_method`.
- **Action failed:** the button returns to normal. A `Banner` `error` inside the card,
  `spacing[3]` above the button: `"Couldn't mark Table 4 served. Try again."`. It clears
  on the next tap.
- **Already changed** (the status is no longer the expected one): no error. Refetch.
- Only the next status is ever sent (`nextOrderStatus`). Waiters may only set `served`
  and `paid` (`STATUS_CHANGES_BY_ROLE`).

### PaymentSheet

A bottom sheet built from React Native `Modal` (`transparent`, `animationType="slide"`,
`statusBarTranslucent`). No package.

```
┌────────────────────────────────────┐
│               ───                  │  handle
│ Mark Table 4 paid                  │
│ Order #12 · 1,370 ETB              │
│                                    │
│ HOW DID THE GUEST PAY?             │
│ ┌────────────────────────────────┐ │
│ │ (💵)  Cash                   ○ │ │
│ └────────────────────────────────┘ │
│ ┌────────────────────────────────┐ │
│ │ (📱)  Telebirr               ● │ │  selected
│ └────────────────────────────────┘ │
│ ┌────────────────────────────────┐ │
│ │ (🏦)  CBE Birr               ○ │ │
│ └────────────────────────────────┘ │
│ This only records how the guest    │
│ paid. No money moves in this app.  │
│ [        Confirm payment        ]  │
│             Cancel                 │
└────────────────────────────────────┘
```

- **Backdrop:** full screen, `colors.scrim`. Tapping it closes the sheet (unless saving).
- **Sheet:** bg `colors.surface`, top corners `radius.xl`, padding `spacing[5]`, bottom
  padding `spacing[5] + insets.bottom`, `shadows.lg`.
- **Handle:** `spacing[10]` × `spacing[1]`, `radius.full`, `colors.borderStrong`,
  centred, `spacing[3]` below it. Decorative.
- **Title:** `"Mark Table 4 paid"` `fontSize.xl` / `lineHeight.xl` bold `colors.text`.
- **Subtitle:** `"Order #12 · 1,370 ETB"` `fontSize.md` `colors.textMuted`, tabular nums.
- `spacing[5]`, **label** `"HOW DID THE GUEST PAY?"` `fontSize.xs` / `lineHeight.xs`
  semibold `colors.textMuted` `letterSpacing: 1` (written uppercase in the string).
- `spacing[2]`, **options** (`PaymentOption` × 3, gap `spacing[3]`), in this order:

| Key (`PAYMENT_METHODS`) | Label | Icon |
|---|---|---|
| `cash` | `"Cash"` | `cash-outline` |
| `telebirr` | `"Telebirr"` | `phone-portrait-outline` |
| `cbe_birr` | `"CBE Birr"` | `business-outline` |

  Generic icons only, no Telebirr or CBE logos: the demo has no real integration and must
  not look like it does. Nothing is selected when the sheet opens.
- `spacing[3]`, **note** `"This only records how the guest paid. No money moves in this
  app."` `fontSize.sm` / `lineHeight.sm` `colors.textSubtle`.
- `spacing[5]`, `primary` Button `"Confirm payment"`. **Disabled** until a method is
  picked. Loading: `"Saving…"`. It sets `status = paid` and `payment_method = <key>` in
  one update.
- `spacing[2]`, `ghost` Button `"Cancel"` (full width). Android back closes the sheet
  too. Both are disabled while saving.
- **Save failed:** keep the sheet open with the choice kept. Show a `Banner` `error`
  above the Confirm button: `"Couldn't save the payment. Check your connection and try
  again."`.
- **Saved:** close the sheet. The card becomes the paid variant once the update
  returns, and Tables shows the table Free.
- a11y: the options are a radio group (`accessibilityRole="radiogroup"` on the wrapper,
  `"radio"` on each option with `accessibilityState={{ checked }}`).

## States added

| Screen | State | What shows |
|---|---|---|
| Both | Live updates paused | `Banner` `info` `"Live updates paused. Reconnecting…"` at the top of the list |
| Tables | Table has a ready order | TableCard ready variant |
| My orders | Order turns ready live | Card jumps to the top, pickup band, ring, phone buzzes, tab badge |
| My orders | Marking served / paid | Button loading `"Saving…"`, other cards still usable |
| My orders | Action failed | Error banner in that card |
| My orders | Paid | Muted card, `"Paid with {method}"` |
| PaymentSheet | No method picked | Confirm disabled |
| PaymentSheet | Saving / failed | `"Saving…"` / error banner, sheet stays |

## Copy (all strings)

- `"Ready"` (summary stat), `"My orders, {n} ready"` (a11y)
- `"Ready — pick up"`
- `"Mark served"`, `"Mark paid"`, `"Saving…"`
- `"Couldn't mark Table {number} served. Try again."`
- `"Paid with {method}"`
- Payment methods: `"Cash"`, `"Telebirr"`, `"CBE Birr"`
- `"Mark Table {number} paid"`, `"Order #{id} · {total}"`, `"HOW DID THE GUEST PAY?"`,
  `"This only records how the guest paid. No money moves in this app."`,
  `"Confirm payment"`, `"Cancel"`
- `"Couldn't save the payment. Check your connection and try again."`
- `"Live updates paused. Reconnecting…"`
- TableCard a11y: `"Table {n}, {seats} seats, order ready to pick up"`
