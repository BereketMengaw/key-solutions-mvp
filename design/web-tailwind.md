# Tailwind setup for the owner website (Tailwind v4)

The website gets its theme from `design/tokens.css`, a Tailwind v4 `@theme` block that is
**generated** from `design/tokens.ts`. Nobody copies hex values by hand, and there is no
`tailwind.config.ts`.

```
design/tokens.ts ──node design/build-tokens-css.mts──▶ design/tokens.css ──@import──▶ web/src/app/globals.css
```

## Why this approach

- **v4-native.** `@theme` is how Tailwind v4 is configured. No legacy `@config` JS file.
- **Nothing runs at build time.** `tokens.css` is committed. Netlify / Cloudflare build
  the web app with plain `npm run build`; no step depends on Node being able to run
  TypeScript.
- **Defaults are switched off.** The file resets Tailwind's own colors, spacing, font
  sizes, radii, shadows and breakpoints, so only token classes exist. `bg-red-500`,
  `p-7` and `text-base` **produce no CSS**. If a class does nothing, it is not a token.
- **Zero packages.** The generator is ~100 lines and uses only Node built-ins.

## Setup (web agent, once)

1. Install Tailwind v4 the standard Next.js way:
   `npm i -D tailwindcss @tailwindcss/postcss` and `postcss.config.mjs`:
   ```js
   export default { plugins: { '@tailwindcss/postcss': {} } };
   ```
2. `web/src/app/globals.css` (adjust `../` depth if the app has no `src/`):
   ```css
   @import "tailwindcss";
   @import "../../../design/tokens.css";

   @layer base {
     html { background: var(--color-background); color: var(--color-text); }
     body { @apply font-sans text-md; }
     :focus-visible { outline: 2px solid var(--color-focus-ring); outline-offset: 2px; }
   }
   ```
   Order matters: `tailwindcss` first, then `tokens.css` (its `initial` resets must come
   after Tailwind's defaults).
3. Font, in `web/src/app/layout.tsx`:
   ```tsx
   import { Noto_Sans } from 'next/font/google';
   const noto = Noto_Sans({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-noto', display: 'swap' });
   // <html lang="en" className={noto.variable}>
   ```
   `tokens.css` sets `--font-sans: var(--font-noto, 'Noto Sans'), 'Noto Sans Ethiopic', system-ui, sans-serif`.
   The variable name **must** be `--font-noto`. Noto Sans Ethiopic is added in the
   Amharic slice (same pattern, appended to the stack).
4. Optional drift guard in `web/package.json`:
   `"tokens:check": "node ../design/build-tokens-css.mts --check"` (needs Node 22.18+).
   It exits 1 if someone edited `tokens.ts` without regenerating.

Importing `design/tokens.ts` or `shared/*.ts` from TypeScript (for timings, `stockLevel`,
`ORDER_STATUSES`…) is outside `web/`. Add `"@design/*": ["../design/*"]` and
`"@shared/*": ["../shared/*"]` to `web/tsconfig.json` `paths` (same as mobile), and in
`next.config.ts` set `turbopack: { root: path.join(__dirname, '..') }` (and
`outputFileTracingRoot` to the same) so Next resolves files above `web/`.

## Changing a token (designer)

Edit `design/tokens.ts` → `node design/build-tokens-css.mts` → commit both files.

## Class names — the mapping is mechanical

camelCase token keys become kebab-case. Everything in `tokens.ts` below has a class.

| Token | CSS variable | Example classes |
|---|---|---|
| `colors.primary` | `--color-primary` | `bg-primary`, `text-primary`, `border-primary`, `ring-primary` |
| `colors.textMuted` | `--color-text-muted` | `text-text-muted` (yes, double "text") |
| `colors.surfaceMuted` | `--color-surface-muted` | `bg-surface-muted` |
| `colors.borderControl` | `--color-border-control` | `border-border-control` |
| `colors.textOnPrimary` | `--color-text-on-primary` | `text-text-on-primary` |
| `colors.levelFillLow` | `--color-level-fill-low` | `bg-level-fill-low` |
| `colors.scrim` | `--color-scrim` | `bg-scrim` |
| `statusColors.lowStock.bg` / `.fg` | `--color-status-low-stock-bg` / `-fg` | `bg-status-low-stock-bg text-status-low-stock-fg` |
| `statusColors.ready.fg` | `--color-status-ready-fg` | `text-status-ready-fg` |
| `statusSolid.ready.bg` / `.pressed` | `--color-solid-ready-bg` / `-pressed` | `bg-solid-ready-bg hover:bg-solid-ready-pressed` |
| `categoryTints[0].bg` | `--color-tint-1-bg` | `bg-tint-1-bg` (1-based) |
| `spacing[4]` | `--spacing-4` | `p-4`, `gap-4`, `mt-4`, `-mt-4`, `w-4` |
| `size.sidebar` | `--spacing-sidebar` | `w-sidebar` |
| `size.content` | `--spacing-content` | `max-w-content` |
| `size.icon` | `--spacing-icon` | `size-icon` |
| `touch.minTarget` | `--spacing-min-target` | `h-min-target min-w-min-target` |
| `touch.primaryAction` | `--spacing-primary-action` | `h-primary-action` |
| `fontSize.md` + `lineHeight.md` | `--text-md` (+ `--text-md--line-height`) | `text-md` sets both |
| `fontWeight.semibold` | `--font-weight-semibold` | `font-semibold` (`font-regular` for 400) |
| `radius.lg` | `--radius-lg` | `rounded-lg` |
| `shadows.md.css` | `--shadow-md` | `shadow-md` |
| `webBreakpoints.lg` | `--breakpoint-lg` | `lg:` = 1024 px and up (`md:` 768, `xl:` 1280) |

Notes:

- **Spacing scale:** only 0, 1, 2, 3, 4, 5, 6, 8, 10, 12, 16 exist (4 px steps).
- **Opacity modifiers work:** `bg-primary/10`. Use them only where a spec says so.
- **Not tokens, use Tailwind's built-ins:** `w-full`, `h-screen`, `inset-0`, `flex`,
  `grid`, `translate-x-full`, `tabular-nums`, `truncate`, `sr-only`, `duration-*`
  (milliseconds come from `timing` in `tokens.ts`, e.g. `duration-400` =
  `timing.levelBarMs`). Border widths use Tailwind's numbers: `border` (1), `border-2`,
  `border-l-4` (= `size.flagEdge`). Use `border-[1.5px]` where a component spec says 1.5.
- **Every theme variable is on `:root`** (`@theme static`), so `style={{ background:
  'var(--color-level-fill)' }}` works when a value must be computed in JS. Prefer
  classes.
- Never write a hex value, `rgb()` or a px number that isn't in this table in the web
  app. If you need one, ask the designer for a token.

## Verified

Generated with Node 26 and compiled with `@tailwindcss/cli` 4.3.3: every class in the
table above produces CSS; `p-7` and `bg-red-500` produce nothing; preflight picks up
`--font-sans` as the default font.
