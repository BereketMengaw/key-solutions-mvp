// Language: English (default) or Amharic, kept in the `ks_lang` cookie so the server renders
// the right language on first paint. Safe to import from server and client code.

export const LANGS = ['en', 'am'] as const;
export type Lang = (typeof LANGS)[number];

export const LANG_COOKIE = 'ks_lang';
/** One year. */
export const LANG_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export function parseLang(value: string | null | undefined): Lang {
  return value === 'am' ? 'am' : 'en';
}

/** A menu item / category / ingredient name in the viewer's language; English when no Amharic name. */
export function nameIn(lang: Lang, row: { name: string; name_am?: string | null }): string {
  return lang === 'am' && row.name_am ? row.name_am : row.name;
}
