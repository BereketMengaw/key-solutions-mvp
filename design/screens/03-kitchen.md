# 03 — Kitchen board

Route: the home screen for role `cook` (it replaces the "this account is for the kitchen"
screen). Device: a 10" Android tablet in landscape, on a wall or a shelf, read from about
a metre away by someone with busy hands.

## Purpose

Every open order on one screen, oldest first, in lanes by status. The cook taps one big
button to move a ticket on: **Start preparing**, then **Mark ready**. A new order has to
be impossible to miss, and a ticket that has waited too long has to stand out.

In the demo this is the "wow" moment: the waiter taps Send, and the ticket drops into
the New lane with a blue ring around it.

## Reference size

Designed at **1280 × 800 dp** (10" tablet, landscape). It must still work at 1024 × 600
(7" tablet). Below `breakpoints.kitchenThreeLanes` the layout changes (see
"Narrower screens").

```
┌───────────────────────────────────────────────────────────────────────────────┐
│ Kitchen                          14:05                  (● Live)   ⎋ Sign out │  top bar
│ Dawit Bekele                                                                  │
├───────────────────────────────────────────────────────────────────────────────┤
│ ┌─ New ───────────── 2 ┐ ┌─ Preparing ─────── 1 ┐ ┌─ Ready ───────── 1 ┐     │  lane headers
│ │┌────────────────────┐│ │┌────────────────────┐│ │┌──────────────────┐│     │
│ ││ Table 4    ⏱ 4 min ││ ││ Table 2  ⚠12 min·Late│ ││ Table 6  [✓Ready]││     │
│ ││ ✈ New              ││ ││ 🔥 Preparing        ││ ││ 3 items · Hana T.││     │
│ ││ #12 · Hana · 14:01 ││ ││ #9 · Hana · 13:53  ││ ││ Waiting for pickup│     │
│ ││ 2×  Beef Tibs      ││ ││ 1×  Shiro          ││ │└──────────────────┘│     │
│ ││     “no onion”     ││ ││ 2×  Buna           ││ │                    │     │
│ ││ 1×  Macchiato      ││ ││ [  ✓ Mark ready   ]││ │                    │     │
│ ││ [ 🔥 Start preparing ]│ │└────────────────────┘│ │                    │     │
│ │└────────────────────┘│ │                      │ │                    │     │
└───────────────────────────────────────────────────────────────────────────────┘
```

## Data

- **Board orders:** `orders` where `status in (sent, preparing, ready)` (use
  `ORDER_STATUSES` values from `shared/constants.ts`), **all dates** (a ticket left open
  from yesterday is still a ticket), ordered by `created_at asc` (oldest first; the cook
  works top-down).
- With each order, in one PostgREST query: `dining_tables(number)`, the waiter's
  `profiles(full_name)` (via `waiter_id`), and
  `order_items(id, quantity, note, menu_items(name))` ordered by `order_items.id`.
- **Live:** one Realtime channel on `orders` (`postgres_changes`, all events).
  - `INSERT` (status `sent`): fetch that one order with its embeds, add it to New
    **with the arrival highlight**.
  - `UPDATE`: if the new status is `sent`/`preparing`/`ready`, put the ticket in that
    lane. If it is `served` or `paid`, remove the ticket (fade out, `timing.enterMs`).
  - Keep the board in a `Map<orderId, Ticket>` so a repeated event never duplicates a
    ticket.
- **After a reconnect** (the channel reports `SUBSCRIBED` again after a drop): refetch the
  whole board, because events sent while offline are lost. Any `sent` order that wasn't
  on the board before the drop gets the arrival highlight. Orders already on the board
  don't.
- First load: no highlights.
- Unsubscribe on unmount and on sign out.
- **Timers:** one interval of `timing.timerTickMs` drives every ticket timer and the
  clock. Don't run one interval per ticket.

## Layout

### 1. Kitchen top bar

- Height `touch.minTarget + spacing[3] * 2` (72) + `insets.top`. Padding horizontal
  `spacing[6]` (+ `insets.left` / `insets.right` in landscape). bg `colors.surface`,
  bottom border 1 `colors.border`.
- **Left:** eyebrow `"Kitchen"` (`fontSize.sm`, `fontWeight.medium`, `colors.textMuted`);
  under it the cook's `full_name` (`fontSize.xl` / `lineHeight.xl`, `fontWeight.bold`,
  `colors.text`, one line). If the name is empty, show `"Cook"`.
- **Centre:** the live clock, `"14:05"` (24-hour `HH:mm`, local time).
  `fontSize['3xl']` / `lineHeight['3xl']`, `fontWeight.bold`, `colors.text`, tabular nums.
  It is centred on the bar (absolutely positioned), not between left and right.
  a11y `"Time 14:05"`.
- **Right** (row, gap `spacing[3]`): `ConnectionPill`, then a `ghost` button with icon
  `log-out-outline` and the label `"Sign out"` (same as on the waiter's Tables screen).

### 2. Connection banner (only when needed)

Between the top bar and the lanes: margin top `spacing[4]`, horizontal `spacing[6]`.
See "Connection states".

### 3. Lanes

- Row, padding top `spacing[4]`, horizontal `spacing[6]`, bottom
  `spacing[4] + insets.bottom`. Gap `spacing[4]`. The lanes fill the remaining height.
- Flex: **New 3 · Preparing 3 · Ready 2**. At 1280 wide that is about 450 / 450 / 300.
- Each lane is a `KitchenLane` (see components.md). Header labels:

| Lane | Shows status | Header label | Icon | Colours |
|---|---|---|---|---|
| New | `sent` | `"New"` | `paper-plane-outline` | `statusColors.sent` |
| Preparing | `preparing` | `"Preparing"` | `flame-outline` | `statusColors.preparing` |
| Ready | `ready` | `"Ready"` | `checkmark-circle-outline` | `statusColors.ready` |

  The kitchen calls `sent` **"New"**. The waiter's app still says "Sent". Same status,
  different point of view.
- New and Preparing hold `KitchenTicket`s. Ready holds `ReadyTicket`s (compact, no
  button). All three are oldest first.
- Each lane scrolls on its own (`FlatList`). The board itself does not scroll.

### 4. Tickets

`KitchenTicket` and `ReadyTicket`: full specs in `components.md`. In short:

- **Header band** in the status's soft colour: `"Table 4"` in `fontSize['4xl']` bold, the
  status word under it, and the timer on the right.
- **Meta line:** `"#12 · Hana Tesfaye · 14:01"`, `fontSize.lg`, `colors.textMuted`.
- **Items:** `"2×"` + `"Beef Tibs"` in `fontSize['2xl']`. Notes go under the item in
  `fontSize.xl` on a muted block. Every line is shown. The kitchen never truncates.
- **One action button**, `touch.kitchenAction` (72) tall, full width. Its colour is the
  `statusSolid` of the lane the ticket moves to: **Start preparing** is amber (Preparing),
  **Mark ready** is green (Ready).

## Ticket timer and "Late"

- Minutes since the order was sent: `floor((now − created_at) / 60000)`. If the result
  is negative (the tablet's clock is behind), treat it as 0.

| Minutes | Shows |
|---|---|
| 0 | `"Just now"` |
| 1–59 | `"4 min"` |
| 60+ | `"1 h 5 min"` |

- Counted from **sent**, in both New and Preparing. The guest has been waiting since
  the order went in, not since the cook started.
- At **`timing.overdueAfterMinutes` (10) or more**, the ticket is **Late**:
  - The timer becomes a solid chip: bg `colors.overdue`, text and icon
    `colors.textOnOverdue`, icon `alert-circle`, label `"12 min · Late"`. White on
    red700 is 7.50:1.
  - The ticket border becomes 3 wide in `colors.overdue` (instead of 1 `colors.border`).
    `colors.overdue` is 7.50:1 on the white surface, so it clears the 3:1 minimum for
    non-text.
  - Nothing else changes. The word "Late" carries the meaning, not just the red.
- Ready tickets have no timer.

## New-ticket arrival (the "wow")

When a ticket arrives live (Realtime `INSERT`, or a new `sent` order after a reconnect):

1. **Enter:** opacity 0 → 1 and translateY `-spacing[4]` → 0 over `timing.enterMs`
   (`Animated`, native driver).
2. **Ring:** a `size.ringWidth` (4) ring in `statusColors.sent.fg` (blue700) sits just
   outside the ticket (absolutely positioned, inset `-size.ringWidth`, radius
   `radius.lg + size.ringWidth`, `pointerEvents="none"`). It stays fully on for
   `timing.newTicketHoldMs` (6 s), then fades out over `timing.newTicketFadeMs` (2 s).
   The ring is 8.31:1 on white and 7.09:1 on the lane fill. The lane body's `spacing[3]`
   padding leaves room for it, so it is never clipped.
3. **"NEW" tag:** in the header band, right after `"Table 4"` (`spacing[3]` gap, aligned
   to the number's centre): a pill, bg `statusSolid.sent.bg`, text `"NEW"`
   `fontSize.sm` / `lineHeight.sm`, `fontWeight.bold`, `statusSolid.sent.fg`,
   `letterSpacing: 1`, padding `spacing[1]` × `spacing[2]`, radius `radius.full`. It
   fades out together with the ring.
4. **Lane count:** the New lane's count chip changes number. No extra animation.
5. **Off-screen arrival** (the New lane is scrolled and the new ticket is below the
   fold): a floating pill pinned `spacing[3]` above the bottom of the New lane, centred:
   bg `statusSolid.sent.bg`, icon `arrow-down` + `"New order below"`, `fontSize.md`
   semibold, `statusSolid.sent.fg`, height `touch.minTarget`, radius `radius.full`,
   `shadows.md`. Tap: `scrollToEnd`. It hides once the ticket is in view or the highlight
   ends. Low priority: the demo never has enough tickets to scroll.
6. No sound.

`AccessibilityInfo.announceForAccessibility("New order, Table 4")` on arrival.

## Moving a ticket (actions)

| Ticket status | Button | Icon | Colours | Loading label | Sets status |
|---|---|---|---|---|---|
| `sent` | `"Start preparing"` | `flame` | `statusSolid.preparing` | `"Starting…"` | `preparing` |
| `preparing` | `"Mark ready"` | `checkmark-circle` | `statusSolid.ready` | `"Marking ready…"` | `ready` |

- **Not optimistic.** On tap the button shows its loading state right away
  (`ActivityIndicator` + loading label, same size and colours). The ticket moves only once
  the update comes back (or when its Realtime `UPDATE` arrives, whichever is first).
  Then it leaves its lane and enters the next with the enter animation. Wrap the state
  change in `LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)` so the
  other tickets slide up instead of jumping.
- While a ticket's action is in flight, only that ticket's button is disabled. Other
  tickets stay tappable.
- Only the next status is ever sent (`nextOrderStatus` from `shared/constants.ts`). The
  database rejects anything else.
- **Action failed:** the button returns to normal and an error `Banner` appears inside
  the ticket, just above the button (margin horizontal `spacing[5]`, top `spacing[3]`):
  `"Couldn't update Table 4. Tap the button to try again."` It clears on the next tap.
  The ticket stays in its lane.
- **Already moved elsewhere** (the update fails because the status is no longer the
  expected one, e.g. a manager moved it on the website): don't show an error. Refetch
  that order and put it where it now belongs.

## Connection states

`ConnectionPill` in the top bar, driven by the Realtime channel status:

| State | When | Pill |
|---|---|---|
| **Connecting** | first subscribe, before `SUBSCRIBED` | bg `colors.surfaceMuted`, small `ActivityIndicator` `colors.textMuted`, `"Connecting…"` `colors.textMuted` |
| **Live** | `SUBSCRIBED` | bg `colors.successSoft`, dot (`spacing[2]`, `radius.full`, `colors.success`), `"Live"` `colors.success` |
| **Reconnecting** | `CHANNEL_ERROR` / `TIMED_OUT` / `CLOSED` (not by us) | bg `colors.warningSoft`, `ActivityIndicator` `colors.warning`, `"Reconnecting…"` `colors.warning` |
| **Offline** | still not `SUBSCRIBED` after `timing.offlineBannerDelayMs` (5 s) | bg `colors.dangerSoft`, icon `cloud-offline-outline` `colors.danger`, `"Offline"` `colors.danger` |

**Offline** also shows the connection banner: `Banner` `error`, title
`"Connection lost"`, body `"New orders won't show up until it's back. Trying again…"`,
action `"Retry now"` (removes and re-creates the channel, then refetches). Tickets stay
on screen, timers keep counting and the buttons stay enabled. If an action fails offline,
the ticket shows its own error.

**Back online:** the banner switches to the `success` variant, `"Back online. The board
is up to date."`, once the refetch has finished. It hides after `timing.backOnlineMs`
(3 s).

Brief drops under 5 s only change the pill. No banner, so nothing flickers.

## States

| State | What shows |
|---|---|
| **Loading (first load)** | Top bar shows right away (name from session, clock, pill "Connecting…"). Lanes with their headers, count chips hidden. New lane: 2 `Skeleton` tickets (height `spacing[16] * 4`, radius `radius.lg`). Preparing: 1. Ready: none. |
| **Empty (quiet kitchen)** | All lanes visible with count `0`. The New lane body shows an `EmptyState`, centred vertically: icon `restaurant-outline`, title `"Kitchen is quiet"`, body `"New orders show up here the moment a waiter sends them."`, no button. Preparing body: `"Nothing cooking"`. Ready body: `"Nothing waiting for pickup"`. Both `fontSize.lg` / `lineHeight.lg`, `colors.textMuted`, centred, padding `spacing[6]`. The `Live` pill tells the client the screen is waiting, not broken. |
| **Some lanes empty** | New empty (but others not): `"No new orders"` in the lane-empty style above, instead of the big EmptyState. |
| **New ticket arrives** | See "New-ticket arrival". |
| **Preparing** | Ticket sits in the Preparing lane: amber band, `"Preparing"` status word, green `"Mark ready"` button. |
| **Late** | See "Ticket timer and Late". |
| **Action in progress** | That ticket's button: spinner + `"Starting…"` / `"Marking ready…"`. |
| **Action failed** | Error banner inside the ticket (above). |
| **Ready** | Compact `ReadyTicket` in the Ready lane. It leaves (fade out) when the waiter marks the order served. |
| **Reconnecting / Offline / Back online** | See "Connection states". |
| **Error (first load failed)** | Lanes are replaced by one `EmptyState` error variant, centred in the board area: title `"Couldn't load orders"`, body `"Check your connection and try again."`, button `"Try again"` (refetch + resubscribe). The top bar stays. |
| **Signing out** | Same Alert as the waiter (`"Sign out?"` / `"You'll need your email and password to sign back in."` / `"Cancel"` / `"Sign out"`). Unsubscribe the channel before `signOut()`. |

## Narrower screens

Use `useWindowDimensions().width` (it updates on rotation):

- **≥ `breakpoints.kitchenThreeLanes` (1100):** three lanes as above.
- **≥ `breakpoints.kitchenTwoLanes` (720), < 1100** (7" landscape, 10" portrait): New and
  Preparing lanes, `flex: 1` each. Ready becomes a **strip** between the top bar and the
  lanes (margin top `spacing[4]`, horizontal `spacing[6]`): a row with the label
  (`checkmark-circle-outline` + `"Ready"`, `fontSize.lg` bold `statusColors.ready.fg`),
  then a horizontal `ScrollView` of chips, gap `spacing[2]`: `"Table 6"`, bg
  `statusColors.ready.bg`, border 2 `statusColors.ready.fg`, text `fontSize.lg` bold
  `statusColors.ready.fg`, padding `spacing[2]` × `spacing[4]`, radius `radius.full`. Hidden
  when nothing is ready.
- **< 720** (phone, not a demo target): one vertical `ScrollView` with sections New,
  Preparing, Ready in that order, each with its lane header. Tickets full width.

## Device notes (mobile)

- The kitchen must open in landscape. `app.json` has `"orientation": "portrait"` today,
  so it needs to become `"default"`. See the open question in the report.
- Keep the screen awake on this screen (`useKeepAwake()` from `expo-keep-awake`). It is
  an Expo SDK module, but it is not installed in `mobile/` yet. Mobile decides.
- Status bar: `dark` content on `colors.surface`.

## Accessibility

- Ticket container: `accessibilityLabel`
  `"Table 4, New, sent 4 minutes ago, 2 Beef Tibs, note no onion, 1 Macchiato"`. Add
  `", late"` when it is Late. The button is a separate element with its own label (the
  visible label).
- Lane header: `"New, 2 orders"` / `"Preparing, 1 order"`.
- Every status is shown with words (lane header, status word, "Late", "NEW"), never by
  colour alone.

## Copy (all strings)

- `"Kitchen"`, `"Cook"` (name fallback), `"Time {HH:mm}"` (a11y)
- Lane headers: `"New"`, `"Preparing"`, `"Ready"`; a11y `"{lane}, {n} order"` /
  `"{lane}, {n} orders"`
- Ticket: `"Table {number}"`, `"NEW"`, `"#{id} · {waiter} · {HH:mm}"`, `"{qty}×"`,
  `"“{note}”"`
- Status words on tickets: `"New"`, `"Preparing"`
- Timer: `"Just now"`, `"{m} min"`, `"{h} h {m} min"`, `"{timer} · Late"`
- Buttons: `"Start preparing"`, `"Starting…"`, `"Mark ready"`, `"Marking ready…"`
- Ready ticket: `"{n} item"` / `"{n} items"` (`common.itemCount`), `"Waiting for pickup"`
- `"New order below"`
- Empty: `"Kitchen is quiet"`, `"New orders show up here the moment a waiter sends them."`,
  `"No new orders"`, `"Nothing cooking"`, `"Nothing waiting for pickup"`
- Connection: `"Connecting…"`, `"Live"`, `"Reconnecting…"`, `"Offline"`,
  `"Connection: {state}"` (a11y), `"Connection lost"`,
  `"New orders won't show up until it's back. Trying again…"`, `"Retry now"`,
  `"Back online. The board is up to date."`
- Errors: `"Couldn't update Table {number}. Tap the button to try again."`,
  `"Couldn't load orders"`, `"Check your connection and try again."`, `"Try again"`
- a11y announce: `"New order, Table {number}"`
- Sign out: `"Sign out"`, `"Sign out?"`, `"You'll need your email and password to sign back in."`, `"Cancel"`
