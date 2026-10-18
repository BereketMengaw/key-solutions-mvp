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

/* ---------------------------------------------------------------- dashboard (slice 5) */

/** "1,370" — the number part of an ETB amount (components.md → Money; no Intl). */
export function formatEtbNumber(n: number): string {
  return n.toFixed(Number.isInteger(n) ? 0 : 2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/** "1,370 ETB", "0 ETB", "70 ETB". */
export function formatEtb(n: number): string {
  return `${formatEtbNumber(n)} ETB`;
}

/** Chart y-axis ticks only: "500", "1K", "1.5K", "12K". */
export function formatEtbCompact(n: number): string {
  if (n < 1000) return String(Math.round(n));
  const k = Math.round(n / 100) / 10;
  return `${Number.isInteger(k) ? k.toFixed(0) : k.toFixed(1)}K`;
}

/** Kitchen timer words: "Just now", "4 min", "1 h 5 min". Negative (clock skew) counts as 0. */
export function formatWait(minutes: number): string {
  const m = Math.max(0, Math.floor(minutes));
  if (m < 1) return 'Just now';
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)} h ${m % 60} min`;
}

/** Whole minutes since `iso`, never negative. */
export function minutesSince(iso: string, now: number): number {
  return Math.max(0, Math.floor((now - new Date(iso).getTime()) / 60_000));
}

const pad2 = (n: number) => String(n).padStart(2, '0');

/** "14:00". */
export function formatHour(h: number): string {
  return `${pad2(h)}:00`;
}

/** "14:00–15:00", "23:00–24:00". */
export function formatHourRange(h: number): string {
  return `${formatHour(h)}–${formatHour(h + 1)}`;
}

const longDate = new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: TZ });

/** "Sunday 18 October" in Addis Ababa. */
export function formatDateLong(now: Date | number): string {
  return longDate.format(now).replace(',', '');
}

/** "2026-10-18" in Addis Ababa (same as dashboard_today().date). */
export function addisDateKey(now: Date | number): string {
  return dayKey.format(now);
}

const hourOnly = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', hourCycle: 'h23', timeZone: TZ });

/** Addis hour 0–23. */
export function addisHour(now: Date | number): number {
  return Number(hourOnly.format(now)) % 24;
}

/** Whole percents by largest remainder (sum 100); 0 < share < 0.5% shows "<1%". */
export function sharePercents(values: number[]): string[] {
  const total = values.reduce((a, b) => a + b, 0);
  if (total <= 0) return values.map(() => '0%');
  const exact = values.map((v) => (v / total) * 100);
  const floors = exact.map(Math.floor);
  let left = 100 - floors.reduce((a, b) => a + b, 0);
  const order = exact.map((e, i) => [e - floors[i], i] as const).sort((a, b) => b[0] - a[0]);
  for (const [, i] of order) {
    if (left <= 0) break;
    floors[i] += 1;
    left -= 1;
  }
  return floors.map((p, i) => (values[i] > 0 && exact[i] < 0.5 ? '<1%' : `${p}%`));
}
