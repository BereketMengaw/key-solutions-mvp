/**
 * Key Solutions design tokens — the single source of colors, spacing, radius,
 * type, shadows and touch sizes for the mobile app (Expo) and the owner website
 * (Next.js + Tailwind).
 *
 * Rules:
 * - Apps use these tokens, never raw hex values.
 * - Numbers are unitless: density-independent pixels in React Native, px on web.
 * - Status is never shown by color alone: always pair a status color with its label.
 * - Every fg/bg pair below passes WCAG AA (4.5:1). See design/README.md.
 *
 * No imports, no dependencies: safe to import from both apps.
 */

/* ------------------------------------------------------------------ */
/* Raw palette — named by hue, never used directly by screens.         */
/* ------------------------------------------------------------------ */

export const palette = {
  white: '#FFFFFF',

  // Cream / warm neutrals (backgrounds, borders)
  cream50: '#FAF6F1',
  cream100: '#F3ECE3',
  cream200: '#E5DACB',
  cream300: '#CDBBA6',

  // Coffee browns (text)
  coffee500: '#7A6253',
  coffee600: '#6B5A4E',
  coffee900: '#2B1D16',

  // Berbere (primary brand)
  berbere50: '#FBEDE7',
  berbere600: '#B23A1A',
  berbere700: '#8E2C12',

  // Status hues
  blue50: '#E6EEF8',
  blue700: '#1F4E8C',
  amber50: '#FDEFD3',
  amber700: '#8A4B00',
  green50: '#DFF3E4',
  green700: '#1B6B35',
  stone100: '#ECE7E1',
  stone700: '#4A4039',
  teal50: '#DDF1EF',
  teal700: '#155E57',
  red50: '#FBE3E0',
  red700: '#A3221A',
} as const;

/* ------------------------------------------------------------------ */
/* Semantic colors — what screens use. One object per theme.           */
/* Only `light` ships for the demo; a `dark` theme would add a second   */
/* object with the same keys (enforced by the ThemeColors type).        */
/* ------------------------------------------------------------------ */

const light = {
  // Surfaces
  background: palette.cream50, // app / page background
  surface: palette.white, // cards, sheets, inputs
  surfaceMuted: palette.cream100, // table rows, section fills
  border: palette.cream200,
  borderStrong: palette.cream300,

  // Text
  text: palette.coffee900, // primary text
  textMuted: palette.coffee600, // secondary text, labels
  textSubtle: palette.coffee500, // hints, timestamps (4.5:1+ on every surface)
  textOnPrimary: palette.white,

  // Brand
  primary: palette.berbere600, // main actions (Send, Save), links
  primaryPressed: palette.berbere700,
  primarySoft: palette.berbere50, // selected table, active tab fill

  // Feedback
  danger: palette.red700,
  dangerSoft: palette.red50,
  success: palette.green700,
  successSoft: palette.green50,

  focusRing: palette.berbere600,
} as const;

export type ThemeColors = { readonly [K in keyof typeof light]: string };

export const themes = {
  light,
} as const satisfies Record<string, ThemeColors>;

/** The active theme for the demo. */
export const colors = themes.light;

/* ------------------------------------------------------------------ */
/* Status colors — fixed, shared by waiter, cook and owner screens.     */
/* Keys for order statuses match shared/constants.ts order statuses.    */
/* Always render the status label next to the color.                    */
/* ------------------------------------------------------------------ */

export const statusColors = {
  sent: { bg: palette.blue50, fg: palette.blue700 },
  preparing: { bg: palette.amber50, fg: palette.amber700 },
  ready: { bg: palette.green50, fg: palette.green700 },
  served: { bg: palette.stone100, fg: palette.stone700 },
  paid: { bg: palette.teal50, fg: palette.teal700 },
  lowStock: { bg: palette.red50, fg: palette.red700 },
} as const;

export type StatusColorKey = keyof typeof statusColors;

/* ------------------------------------------------------------------ */
/* Spacing — 4-point scale.                                             */
/* ------------------------------------------------------------------ */

export const spacing = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
} as const;

/* ------------------------------------------------------------------ */
/* Radius                                                               */
/* ------------------------------------------------------------------ */

export const radius = {
  none: 0,
  sm: 6,
  md: 10,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

/* ------------------------------------------------------------------ */
/* Typography                                                           */
/* Line heights are ~1.5–1.6x: Ge'ez (Amharic) glyphs run taller than   */
/* Latin, so never set a tighter line height or a fixed text box height.*/
/* Values are absolute (RN needs numbers, not ratios).                  */
/* ------------------------------------------------------------------ */

export const fontFamily = {
  // Load via expo-font / next/font. Noto Sans Ethiopic covers Ge'ez;
  // Noto Sans covers Latin and digits. Both are free Google Fonts.
  sans: ['Noto Sans', 'Noto Sans Ethiopic', 'system-ui', 'sans-serif'],
} as const;

export const fontSize = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 22,
  '2xl': 28,
  '3xl': 36,
} as const;

export const lineHeight = {
  xs: 18,
  sm: 22,
  md: 26,
  lg: 28,
  xl: 34,
  '2xl': 42,
  '3xl': 52,
} as const satisfies { readonly [K in keyof typeof fontSize]: number };

/** Strings because React Native's fontWeight only accepts strings. */
export const fontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const;

/* ------------------------------------------------------------------ */
/* Shadows / elevation                                                  */
/* RN fields (shadow*, elevation) for mobile; `css` for web/Tailwind.   */
/* Shadow color is coffee900, so shadows read warm, not grey.           */
/* ------------------------------------------------------------------ */

export const shadows = {
  none: {
    shadowColor: palette.coffee900,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
    css: 'none',
  },
  sm: {
    shadowColor: palette.coffee900,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
    css: '0 1px 2px rgba(43, 29, 22, 0.08)',
  },
  md: {
    shadowColor: palette.coffee900,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    css: '0 4px 8px rgba(43, 29, 22, 0.10)',
  },
  lg: {
    shadowColor: palette.coffee900,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 16,
    elevation: 8,
    css: '0 8px 16px rgba(43, 29, 22, 0.14)',
  },
} as const;

/* ------------------------------------------------------------------ */
/* Touch                                                                */
/* ------------------------------------------------------------------ */

export const touch = {
  /** Minimum height and width of anything tappable. */
  minTarget: 48,
} as const;

export const tokens = {
  palette,
  themes,
  colors,
  statusColors,
  spacing,
  radius,
  fontFamily,
  fontSize,
  lineHeight,
  fontWeight,
  shadows,
  touch,
} as const;

export default tokens;
