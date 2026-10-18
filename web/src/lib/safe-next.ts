/** Placeholder origin: `next` is resolved against it and must stay on it. */
const BASE = 'http://same-site.invalid';

/**
 * Turns a ?next= value into a same-site path ("/stock?filter=low"), or null.
 * The URL parser silently drops tabs/newlines and treats "\" like "/", so "/\t/evil.com"
 * becomes "//evil.com". Reject control chars, whitespace and backslashes up front,
 * then require the parsed URL to keep our origin and rebuild it from its parts.
 */
export function safeNext(next: unknown): string | null {
  if (typeof next !== 'string' || !next.startsWith('/')) return null;
  if (/[\x00-\x1f\x7f-\x9f\\]|\s/.test(next)) return null;
  let url: URL;
  try {
    url = new URL(next, BASE);
  } catch {
    return null;
  }
  if (url.origin !== BASE || url.pathname.startsWith('//')) return null;
  return url.pathname + url.search + url.hash;
}
