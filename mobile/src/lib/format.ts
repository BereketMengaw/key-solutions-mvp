/** 24-hour "HH:mm" in the phone's local time. */
export function formatTime(iso: string): string {
  const d = new Date(iso);
  const pad = (v: number) => String(v).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * "Beef Tibs" → "BT", "Macchiato" → "Ma", "የበሬ ጥብስ" → "በጥ". Array.from keeps Ge'ez characters whole.
 * The Amharic possessive prefix "የ" ("of") is dropped, as an English monogram skips "of".
 */
export function monogram(name: string): string {
  const words = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => (w.startsWith('የ') && Array.from(w).length > 2 ? w.slice(1) : w));
  if (words.length >= 2) {
    return words
      .slice(0, 2)
      .map((w) => (Array.from(w)[0] ?? '').toUpperCase())
      .join('');
  }
  const chars = Array.from(words[0] ?? '');
  return (chars[0] ?? '').toUpperCase() + (chars[1] ?? '').toLowerCase();
}

/** First letter of the first two words, for the avatar circle. */
export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => (Array.from(w)[0] ?? '').toUpperCase())
    .join('');
}

/** Local midnight as an ISO timestamp (the phone's "today"). */
export function startOfTodayIso(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

/** Whole minutes from `iso` to `now`; never negative (a tablet clock that runs behind shows 0). */
export function minutesSince(iso: string, now: number): number {
  return Math.max(0, Math.floor((now - new Date(iso).getTime()) / 60_000));
}
