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
 * No runtime imports, no dependencies: safe to import from both apps.
 * The one `import type` below is erased at compile time; it only lets the
 * compiler check that statusColors covers exactly the shared order statuses.
 */

import type { OrderStatus, PaymentMethod } from '../shared/constants';

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
  coffee400: '#958070',
  coffee500: '#7A6253',
  coffee600: '#6B5A4E',
  coffee900: '#2B1D16',

  // Berbere (primary brand)
  berbere50: '#FBEDE7',
  berbere600: '#B23A1A',
  berbere700: '#8E2C12',

  // Status hues (800s are the pressed shade of a solid status button)
  blue50: '#E6EEF8',
  blue700: '#1F4E8C',
  blue800: '#173D6E',
  amber50: '#FDEFD3',
  amber700: '#8A4B00',
  amber800: '#6E3B00',
  green50: '#DFF3E4',
  green700: '#1B6B35',
  green800: '#145229',
  stone100: '#ECE7E1',
  stone700: '#4A4039',
  stone800: '#352D28',
  teal50: '#DDF1EF',
  teal700: '#155E57',
  teal800: '#0F4A44',
  red50: '#FBE3E0',
  red700: '#A3221A',

  // Menu category tints (item tile fallback when there is no photo)
  saffron50: '#FBE7C2',
  saffron800: '#7A4A06',
  berbere100: '#F8DDD2',
  roast100: '#EBDDD0',
  roast800: '#5A3A26',
  avocado50: '#E3EDD2',
  avocado800: '#3D5A16',

  // Payment mix chart (owner dashboard, slice 5). Validated as a categorical set.
  saffron600: '#C77A12',
  blue600: '#2F6BC4',
  plum600: '#A63D72',
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
  /** Outline of inputs and outlined controls: 3:1+ on every surface (WCAG 1.4.11). */
  borderControl: palette.coffee400,

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
  /** Connection trouble ("Reconnecting…"): a state, not an error yet. */
  warning: palette.amber700,
  warningSoft: palette.amber50,

  // Kitchen: a ticket waiting longer than timing.overdueAfterMinutes.
  // Always shown with the word "Late", never by color alone.
  overdue: palette.red700,
  overdueSoft: palette.red50,
  textOnOverdue: palette.white,

  focusRing: palette.berbere600,

  // Stock level bar (owner website, slice 4). Non-text, 3:1+ where it matters:
  // levelFill on levelTrack 5.60, levelFillLow on levelTrack 6.40, levelTick on
  // surface 3.75 / on primarySoft (row flash) 3.28. The track itself is decorative.
  levelTrack: palette.cream100,
  levelFill: palette.coffee600,
  levelFillLow: palette.red700,
  levelTick: palette.coffee400,

  // Dashboard charts (owner website, slice 5). Non-text marks, 3:1+ on surface.
  /** Single-series chart marks (sales by hour, top items). 6.57:1 on surface. */
  chartBar: palette.coffee600,
  /** Hovered / focused bar. 16.28:1 on surface. */
  chartBarActive: palette.coffee900,
  /** Payment mix: colour follows the method (PAYMENT_METHODS), never its rank. */
  paymentCash: palette.saffron600, // 3.38:1 on surface
  paymentTelebirr: palette.blue600, // 5.22:1
  paymentCbeBirr: palette.plum600, // 5.95:1

  /** Dim layer behind a bottom sheet (coffee900 at 45%). Decorative, no text on it. */
  scrim: 'rgba(43, 29, 22, 0.45)',
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

export type ColorPair = { readonly bg: string; readonly fg: string };

/**
 * `satisfies` fails to compile if an order status is added to or removed from
 * shared/constants.ts without a matching color here (missing or extra key).
 */
export const statusColors = {
  sent: { bg: palette.blue50, fg: palette.blue700 },
  preparing: { bg: palette.amber50, fg: palette.amber700 },
  ready: { bg: palette.green50, fg: palette.green700 },
  served: { bg: palette.stone100, fg: palette.stone700 },
  paid: { bg: palette.teal50, fg: palette.teal700 },
  lowStock: { bg: palette.red50, fg: palette.red700 },
} as const satisfies Record<OrderStatus | 'lowStock', ColorPair>;

export type StatusColorKey = keyof typeof statusColors;

/**
 * Payment mix colours by method. `satisfies` fails to compile if a payment method is
 * added to or removed from shared/constants.ts without a colour here.
 * Web uses the classes bg-payment-cash / bg-payment-telebirr / bg-payment-cbe-birr.
 */
export const paymentColors = {
  cash: light.paymentCash,
  telebirr: light.paymentTelebirr,
  cbe_birr: light.paymentCbeBirr,
} as const satisfies Record<PaymentMethod, string>;

/**
 * Solid status colors: the button that moves an order INTO a status uses that
 * status's solid color (kitchen "Start preparing" = preparing, "Mark ready" =
 * ready), so the button matches the lane the ticket is about to join.
 * fg on bg and fg on pressed pass AA (lowest: white on green700, 6.56:1).
 */
export type SolidColor = { readonly bg: string; readonly pressed: string; readonly fg: string };

export const statusSolid = {
  sent: { bg: palette.blue700, pressed: palette.blue800, fg: palette.white },
  preparing: { bg: palette.amber700, pressed: palette.amber800, fg: palette.white },
  ready: { bg: palette.green700, pressed: palette.green800, fg: palette.white },
  served: { bg: palette.stone700, pressed: palette.stone800, fg: palette.white },
  paid: { bg: palette.teal700, pressed: palette.teal800, fg: palette.white },
} as const satisfies Record<OrderStatus, SolidColor>;

/* ------------------------------------------------------------------ */
/* Category tints — the item tile fallback when a menu item has no      */
/* photo. Picked by the category's position (sort_order), not its name, */
/* so renamed or translated categories keep working:                    */
/*   categoryTints[(sortOrder - 1) % categoryTints.length]              */
/* Seed order: Breakfast, Main dishes, Hot drinks, Cold drinks.         */
/* fg on bg passes AA (lowest 6.16:1).                                  */
/* ------------------------------------------------------------------ */

export const categoryTints = [
  { bg: palette.saffron50, fg: palette.saffron800 }, // 1 Breakfast — saffron
  { bg: palette.berbere100, fg: palette.berbere700 }, // 2 Main dishes — berbere
  { bg: palette.roast100, fg: palette.roast800 }, // 3 Hot drinks — roast coffee
  { bg: palette.avocado50, fg: palette.avocado800 }, // 4 Cold drinks — avocado
] as const satisfies readonly ColorPair[];

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
  /** Data end of a chart bar (square at the baseline): rounded-t-bar. */
  bar: 4,
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
  /** Kitchen ticket table number: read from a metre away. */
  '4xl': 48,
} as const;

export const lineHeight = {
  xs: 18,
  sm: 22,
  md: 26,
  lg: 28,
  xl: 34,
  '2xl': 42,
  '3xl': 52,
  '4xl': 64,
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
  /** Height of the one primary action on a screen (Sign in, Send to kitchen, cart bar). */
  primaryAction: 56,
  /** Kitchen ticket action (Start preparing / Mark ready): hit with a wet hand. */
  kitchenAction: 72,
} as const;

/* ------------------------------------------------------------------ */
/* Fixed sizes for icons and fallback tiles.                            */
/* ------------------------------------------------------------------ */

export const size = {
  iconSm: 16,
  icon: 20,
  iconLg: 24,
  iconXl: 40,
  /** Square item tile in cart / order rows. */
  tileSm: 48,
  /** Height of the tinted tile at the top of a menu item card. */
  tileCard: 88,
  /** Brand mark (login, startup). */
  brandMark: 64,
  /** Success / empty-state icon circle. */
  heroCircle: 88,
  /** Minimum height of a table card on the Tables grid. */
  tableCard: 136,
  /** Max width of centered body copy (empty states, confirmations). */
  textBlock: 300,
  /** Highlight ring around a newly arrived kitchen ticket. */
  ringWidth: 4,
  /** Colored top edge of a kitchen lane. */
  laneEdge: 6,

  // Owner website (slice 4)
  /** Left sidebar on laptop (>= webBreakpoints.lg). */
  sidebar: 240,
  /** Top bar on tablet/phone (< webBreakpoints.lg). */
  topBar: 64,
  /** Max width of a page's content column, centered in the main area. */
  content: 1120,
  /** Right-hand side panel on the Stock page (Recent changes), >= webBreakpoints.xl. */
  sidePanel: 320,
  /** Add stock drawer width (>= webBreakpoints.md; full screen below). */
  drawer: 440,
  /** Login form card width. */
  loginCard: 420,
  /** Small brand mark in the sidebar / top bar. */
  brandMarkSm: 36,
  /** User avatar circle in the sidebar. */
  avatar: 40,
  /** Stock level bar track height. */
  levelBar: 8,
  /** Low-level tick on the stock bar: taller than the track so it shows over the fill. */
  levelTick: 16,
  /** Width of that tick. */
  levelTickWidth: 2,
  /** Left edge on a low-stock row / card. */
  flagEdge: 4,
  /** Min widths of the Stock table's On hand / Status columns (no shift on live updates). */
  stockQtyCol: 112,
  stockStatusCol: 88,
  /** Space reserved under phone pages that have a sticky bottom action bar (12 + 56 + 12, rounded up). */
  phoneActionBar: 96,

  // Owner dashboard (slice 5)
  /** Sales by hour plot height (>= webBreakpoints.md). */
  chartPlot: 200,
  /** Sales by hour plot height on phone (< webBreakpoints.md). */
  chartPlotSm: 160,
  /** Max width of one hourly bar. */
  hourBar: 24,
  /** Top items bar thickness. */
  itemBar: 8,
  /** Payment mix stacked bar height. */
  mixBar: 16,
} as const;

/* ------------------------------------------------------------------ */
/* Breakpoints — screen width in dp/px (useWindowDimensions().width).   */
/* ------------------------------------------------------------------ */

export const breakpoints = {
  /** Kitchen board: New | Preparing | Ready lanes side by side (landscape tablet). */
  kitchenThreeLanes: 1100,
  /** Kitchen board: New | Preparing side by side, Ready as a strip on top. */
  kitchenTwoLanes: 720,
} as const;

/**
 * Owner website breakpoints (px). Names match Tailwind's, so `md:`, `lg:`, `xl:`
 * are these exact widths (design/tokens.css resets Tailwind's own list).
 */
export const webBreakpoints = {
  /** Stock table replaces stock cards; Add stock opens as a side drawer. */
  md: 768,
  /** Sidebar replaces the top bar. */
  lg: 1024,
  /** Recent changes panel sits beside the stock table instead of below it. */
  xl: 1280,
} as const;

/* ------------------------------------------------------------------ */
/* Stock level bar (owner website)                                      */
/* ------------------------------------------------------------------ */

export const stockLevel = {
  /**
   * The bar is full at threshold x barScale, so the low-level tick sits at
   * 1 / barScale (16.7%) of every bar and the column scans as one line.
   * 6 keeps seed stock (3-10x its threshold) spread out instead of all-full.
   * fill% = min(quantity / (threshold * barScale), 1) * 100.
   * threshold 0 → bar full, no tick.
   */
  barScale: 6,
} as const;

/* ------------------------------------------------------------------ */
/* Timing — durations (ms) and thresholds shared by specs.              */
/* ------------------------------------------------------------------ */

export const timing = {
  /** A kitchen ticket turns "Late" this many minutes after it was sent. */
  overdueAfterMinutes: 10,
  /** How often the ticket timers and the clock re-render. */
  timerTickMs: 10_000,
  /** New-ticket highlight: fully on for this long, then fades. */
  newTicketHoldMs: 6_000,
  newTicketFadeMs: 2_000,
  /** Ticket / card enter animation. */
  enterMs: 250,
  /** Wait this long in a broken connection before showing the banner (avoids flicker). */
  offlineBannerDelayMs: 5_000,
  /** "Back online" banner stays this long. */
  backOnlineMs: 3_000,
  /** Waiter phone buzz when one of their orders turns Ready. */
  readyVibrateMs: 400,
  /** Owner website: a row/entry that just changed live — tint holds, then fades. */
  rowFlashHoldMs: 1_500,
  rowFlashFadeMs: 1_500,
  /** The "−0.5 kg" change shown next to a quantity that just changed. */
  deltaShowMs: 6_000,
  /** Toast after Add stock. */
  toastMs: 5_000,
  /** Stock level bar width transition. */
  levelBarMs: 400,
  /** Dashboard tile values count from old to new. */
  countUpMs: 600,
} as const;

/* ------------------------------------------------------------------ */
/* Dashboard (owner website, slice 5). TS only, not emitted to CSS.     */
/* ------------------------------------------------------------------ */

export const dashboard = {
  /** Sales by hour: first Addis hour always shown. */
  dayStartHour: 6,
  /** Sales by hour: shown up to (not including) this hour; stretches to include now and any hour with sales. */
  dayEndHour: 22,
  /** Smallest y-axis maximum, ETB (one Macchiato must not fill the chart). */
  axisMinEtb: 1000,
  /** Rows in Top items today. */
  topItems: 5,
  /** Rows in Stock alerts before "See all". */
  stockAlertRows: 5,
} as const;

export const tokens = {
  palette,
  themes,
  colors,
  statusColors,
  statusSolid,
  paymentColors,
  categoryTints,
  spacing,
  radius,
  fontFamily,
  fontSize,
  lineHeight,
  fontWeight,
  shadows,
  touch,
  size,
  breakpoints,
  webBreakpoints,
  stockLevel,
  timing,
  dashboard,
} as const;

export default tokens;
