# Design tokens

`tokens.ts` is the single source of colors, spacing, radius, type, shadows and touch size
for the waiter/cook app (Expo) and the owner website (Next.js + Tailwind). Apps import
tokens; they never write raw hex values or magic numbers.

## Palette

Warm café identity: cream surfaces, coffee-brown text, berbere red as the one confident
brand color. Light theme only for the demo.

| Role | Token | Hex |
|---|---|---|
| Page background | `colors.background` | `#FAF6F1` |
| Card / input surface | `colors.surface` | `#FFFFFF` |
| Muted fill | `colors.surfaceMuted` | `#F3ECE3` |
| Border / strong border | `colors.border` / `borderStrong` | `#E5DACB` / `#CDBBA6` |
| Input / control outline | `colors.borderControl` | `#958070` |
| Text | `colors.text` | `#2B1D16` |
| Secondary text | `colors.textMuted` | `#6B5A4E` |
| Hint text | `colors.textSubtle` | `#7A6253` |
| Primary (Send, Save, links) | `colors.primary` | `#B23A1A` |
| Primary pressed | `colors.primaryPressed` | `#8E2C12` |
| Primary soft (selected) | `colors.primarySoft` | `#FBEDE7` |
| Text on primary | `colors.textOnPrimary` | `#FFFFFF` |
| Warning (reconnecting) / soft | `colors.warning` / `warningSoft` | `#8A4B00` / `#FDEFD3` |
| Overdue ticket ("Late") / soft | `colors.overdue` / `overdueSoft` | `#A3221A` / `#FBE3E0` |
| Text on overdue | `colors.textOnOverdue` | `#FFFFFF` |
| Sheet backdrop | `colors.scrim` | `rgba(43, 29, 22, 0.45)` |

### Status colors (fixed)

| Status | fg | bg |
|---|---|---|
| sent | `#1F4E8C` | `#E6EEF8` |
| preparing | `#8A4B00` | `#FDEFD3` |
| ready | `#1B6B35` | `#DFF3E4` |
| served | `#4A4039` | `#ECE7E1` |
| paid | `#155E57` | `#DDF1EF` |
| lowStock | `#A3221A` | `#FBE3E0` |

### Solid status colors (slice 3)

`statusSolid[status]` is the solid version of each status. Use it for a button that
**moves an order into** that status. On the kitchen, "Start preparing" is
`statusSolid.preparing` and "Mark ready" is `statusSolid.ready`, so the button matches
the lane the ticket is about to join. White text on every bg and pressed shade.

| Status | bg | pressed | white on bg | white on pressed |
|---|---|---|---|---|
| sent | `#1F4E8C` | `#173D6E` | 8.31 | 10.89 |
| preparing | `#8A4B00` | `#6E3B00` | 6.80 | 9.18 |
| ready | `#1B6B35` | `#145229` | 6.56 | 9.26 |
| served | `#4A4039` | `#352D28` | 10.08 | 13.48 |
| paid | `#155E57` | `#0F4A44` | 7.58 | 10.08 |

The waiter's Mark served / Mark paid buttons stay `primary`: on the phone, berbere is
always "the action". The kitchen tablet has no berbere buttons, so the red of a **Late**
ticket never gets confused with an action.

`statusColors` and `statusSolid` are checked against `OrderStatus` from `shared/constants.ts` with
`satisfies` (a type-only import, erased at runtime). Adding or removing an order status
without updating the colors fails every app's typecheck.

### Category tints (menu item fallback)

Menu items have no photos. Each item card shows a tinted tile with a monogram instead,
picked by category position: `categoryTints[(sortOrder - 1) % categoryTints.length]`.

| # | Seed category | fg | bg | Ratio |
|---|---|---|---|---|
| 1 | Breakfast (saffron) | `#7A4A06` | `#FBE7C2` | 6.16 |
| 2 | Main dishes (berbere) | `#8E2C12` | `#F8DDD2` | 6.46 |
| 3 | Hot drinks (roast) | `#5A3A26` | `#EBDDD0` | 7.63 |
| 4 | Cold drinks (avocado) | `#3D5A16` | `#E3EDD2` | 6.48 |

**Status never relies on color alone.** Every badge, ticket and alert shows the status
word (and an icon where there is room). Color-blind staff and a glare-washed kitchen
tablet must still read it.

### Contrast

Every fg/bg pair above, primary on every surface, white on primary/pressed, and all
three text colors on every surface pass WCAG AA (4.5:1). Lowest pair: `textSubtle` on
`surfaceMuted`, 4.84:1. Also checked for slice 2: `primary` on `primarySoft` 5.23,
`textMuted` on `primarySoft` 5.74, `danger` on `dangerSoft` 6.13, `success` on
`successSoft` 5.65. Non-text (WCAG 1.4.11, 3:1): `borderControl` on surface 3.75,
background 3.49, surfaceMuted 3.20. `border`/`borderStrong` are decorative only (card
edges), never the only edge of an input. If you add a color, check it before using it.

Slice 3 checks (all WCAG AA). Kitchen lane headers on the cream100 lane fill: blue700
7.09, amber700 5.80, green700 5.60. Ticket band text: `text` on blue50 13.91, on amber50
14.31. `textMuted` on blue50 5.61, `textSubtle` on blue50 4.85. Late chip: white on
`overdue` 7.50. Late border and the new-ticket ring (non-text, 3:1): `overdue` on surface
7.50, blue700 on surface 8.31. Connection pill: `warning` on `warningSoft` 5.98,
`success` on `successSoft` 5.65, `danger` on `dangerSoft` 6.13. Tab badge: white on
`success` 6.56. Paid line: teal700 on `surfaceMuted` 6.47. Splash / icon dot:
`primarySoft` on `primary` 5.23.

Slice 4 checks (owner website). Stock level bar (non-text, 3:1): `levelFill` on
`levelTrack` 5.60, `levelFillLow` on `levelTrack` 6.40, `levelTick` on surface 3.75 and
on `primarySoft` (live-change row tint) 3.28. Text on the row tint `primarySoft`: `text`
14.24, `textMuted` 5.74, `textSubtle` 4.97, `danger` 6.56. Text on the low-stock chip /
tile `dangerSoft`: `text` 13.31, `textMuted` 5.37, `textSubtle` 4.64. Sidebar active
item: `primary` on `primarySoft` 5.23. Login brand panel: white on `primary` 5.98,
`primarySoft` on `primary` 5.23. The bar's track is decorative (the fill and the tick
carry the meaning, and the number is always printed next to it).

### Dark mode later

Screens use `colors.*` (semantic), never `palette.*` (raw). To add dark mode, add a
`dark` object to `themes` — the `ThemeColors` type forces the same keys — and switch
which theme `colors` points to.

## Type

- **Font:** Noto Sans (Latin, digits) + Noto Sans Ethiopic (Ge'ez), both free Google
  Fonts. Load with `expo-font` / `@expo-google-fonts` on mobile and `next/font/google`
  on web. No package is added in `design/`.
- **Line heights** are about 1.5–1.6x the font size because Ge'ez glyphs run taller than
  Latin. Never use a tighter line height or a fixed-height text box; Amharic labels are
  also often longer, so let text wrap.
- `fontWeight` values are strings because React Native requires that.

## Kitchen sizes

The kitchen tablet is read from about a metre away. Its tickets use
`fontSize['4xl']` (48) for the table number, `fontSize['2xl']` (28) for items and the
timer, and `fontSize.xl` (22) for notes. The action buttons are `touch.kitchenAction`
(72) tall. Layout switches at `breakpoints.kitchenThreeLanes` (1100) and
`breakpoints.kitchenTwoLanes` (720). Timer thresholds and animation durations live in
`timing` (e.g. `timing.overdueAfterMinutes` = 10).

## Owner website (slice 4)

Laptop first (designed at 1440 and 1280), usable at 390. Tokens added for it:
`size.sidebar` 240, `size.topBar` 64, `size.content` 1120, `size.sidePanel` 320,
`size.drawer` 440, `size.loginCard` 420, `size.brandMarkSm` 36, `size.avatar` 40,
`size.levelBar` 8, `size.levelTick` 16, `size.levelTickWidth` 2, `size.flagEdge` 4,
`size.stockQtyCol` 112, `size.stockStatusCol` 88, `size.phoneActionBar` 96;
`webBreakpoints` md 768 / lg 1024 / xl 1280; `stockLevel.barScale` 6; colors `levelTrack`, `levelFill`,
`levelFillLow`, `levelTick`; timings `rowFlashHoldMs`, `rowFlashFadeMs`, `deltaShowMs`,
`toastMs`, `levelBarMs`. Screens: `screens/04-web-shell.md`, `screens/04-stock.md`.

## Touch

Anything tappable is at least `touch.minTarget` (48) high and wide. The one primary action
on a screen (Sign in, Send to kitchen, cart bar) is `touch.primaryAction` (56) high.
Icon and tile sizes live in `size`.

Component and screen specs: `components.md`, `screens/`. App icon, splash and favicon:
`brand/` (see `brand/README.md`).

## Using the tokens

Numbers are unitless: dp in React Native, px on the web.

**Expo**

```ts
import { colors, spacing, radius, fontSize, lineHeight, shadows } from '../design/tokens';

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    padding: spacing[4],
    borderRadius: radius.lg,
    ...shadows.md, // `css` key is ignored by RN; strip it if lint complains
  },
  title: { fontSize: fontSize.lg, lineHeight: lineHeight.lg, color: colors.text },
});
```

**Tailwind (web)** — Tailwind v4 reads `design/tokens.css`, generated from `tokens.ts`
by `node design/build-tokens-css.mts`. Setup, class names (`bg-primary`,
`text-text-muted`, `p-4`, `w-sidebar`, `lg:`) and rules: **`web-tailwind.md`**.
After changing `tokens.ts`, regenerate and commit `tokens.css` too.
