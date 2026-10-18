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
| Text | `colors.text` | `#2B1D16` |
| Secondary text | `colors.textMuted` | `#6B5A4E` |
| Hint text | `colors.textSubtle` | `#7A6253` |
| Primary (Send, Save, links) | `colors.primary` | `#B23A1A` |
| Primary pressed | `colors.primaryPressed` | `#8E2C12` |
| Primary soft (selected) | `colors.primarySoft` | `#FBEDE7` |
| Text on primary | `colors.textOnPrimary` | `#FFFFFF` |

### Status colors (fixed)

| Status | fg | bg |
|---|---|---|
| sent | `#1F4E8C` | `#E6EEF8` |
| preparing | `#8A4B00` | `#FDEFD3` |
| ready | `#1B6B35` | `#DFF3E4` |
| served | `#4A4039` | `#ECE7E1` |
| paid | `#155E57` | `#DDF1EF` |
| lowStock | `#A3221A` | `#FBE3E0` |

**Status never relies on color alone.** Every badge, ticket and alert shows the status
word (and an icon where there is room). Color-blind staff and a glare-washed kitchen
tablet must still read it.

### Contrast

Every fg/bg pair above, primary on every surface, white on primary/pressed, and all
three text colors on every surface pass WCAG AA (4.5:1). Lowest pair: `textSubtle` on
`surfaceMuted`, 4.84:1. If you add a color, check it before using it.

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

## Touch

Anything tappable is at least `touch.minTarget` (48) high and wide.

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

**Tailwind (web)** — import in `tailwind.config.ts` (Tailwind v4: point to it with
`@config` in the CSS) and add `px`:

```ts
import { colors, statusColors, spacing, radius, fontSize, lineHeight, shadows, fontFamily } from '../design/tokens';

const px = <T extends Record<string, number>>(o: T) =>
  Object.fromEntries(Object.entries(o).map(([k, v]) => [k, `${v}px`]));

export default {
  theme: {
    colors: { ...colors, status: statusColors },        // bg-status-ready-bg text-status-ready-fg
    spacing: px(spacing),
    borderRadius: px(radius),
    fontSize: Object.fromEntries(
      Object.entries(fontSize).map(([k, v]) => [k, [`${v}px`, `${lineHeight[k as keyof typeof lineHeight]}px`]]),
    ),
    boxShadow: Object.fromEntries(Object.entries(shadows).map(([k, v]) => [k, v.css])),
    fontFamily: { sans: [...fontFamily.sans] },
  },
};
```
