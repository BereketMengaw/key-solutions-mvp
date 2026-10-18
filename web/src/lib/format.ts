// Formatting helpers (design/components.md → "Formatting helpers").
// Units are always the ingredient's own unit: never convert.

import { stockLevel } from '@design/tokens';

const NBSP = ' ';
const MINUS = '−';
const TZ = 'Africa/Addis_Ababa';

const qty2 = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });
const qty0 = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
const qty3 = new Intl.NumberFormat('en-US', { maximumFractionDigits: 3 });

const isPieces = (unit: string) => unit === 'pcs';

/** "5.3 kg", "120 pcs", "1,250 pcs". */
export function formatQuantity(n: number, unit: string): string {
  return `${(isPieces(unit) ? qty0 : qty2).format(n)}${NBSP}${unit}`;
}

/** "+10 kg", "−0.018 kg", "−4 pcs". */
export function formatDelta(n: number, unit: string): string {
  const body = (isPieces(unit) ? qty0 : qty3).format(Math.abs(n));
  return `${n < 0 ? MINUS : '+'}${body}${NBSP}${unit}`;
}

export function unitWord(unit: string): string {
  if (unit === 'L') return 'litres';
  if (unit === 'pcs') return 'pieces';
  return unit;
}

const hhmm = new Intl.DateTimeFormat('en-GB', {
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
  timeZone: TZ,
});
const dayKey = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' });
const dayMonth = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, day: 'numeric', month: 'short' });

/** "14:02" today, "Yesterday 14:02", "12 Oct 14:02" — Addis Ababa time on server and client. */
export function formatTime(iso: string, now: Date = new Date()): string {
  const d = new Date(iso);
  const time = hhmm.format(d);
  const day = dayKey.format(d);
  if (day === dayKey.format(now)) return time;
  if (day === dayKey.format(new Date(now.getTime() - 86_400_000))) return `Yesterday ${time}`;
  return `${dayMonth.format(d)} ${time}`;
}

/* ---------------------------------------------------------------- stock rules */

/** Low stock = strictly below the threshold (same rule as the backend). Raw numbers only. */
export function isLow(quantity: number, threshold: number): boolean {
  return quantity < threshold;
}

export function isOut(quantity: number): boolean {
  return quantity <= 0;
}

/** LevelBar fill, 0–100. Full at threshold × barScale; a non-empty bar shows at least 2%. */
export function levelPct(quantity: number, threshold: number): number {
  if (threshold <= 0) return 100;
  if (quantity <= 0) return 0;
  return Math.max(2, Math.min(quantity / (threshold * stockLevel.barScale), 1) * 100);
}

/** Position of the low-level tick on every bar (16.7%). */
export const tickPct = 100 / stockLevel.barScale;

/** "AK" from "Abebe Kebede". */
export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join('');
}
