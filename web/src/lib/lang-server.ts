import 'server-only';

import { cookies } from 'next/headers';
import { LANG_COOKIE, parseLang, type Lang } from '@/lib/i18n';
import { strings, type Strings } from '@/lib/strings';

/** The viewer's language from the `ks_lang` cookie (English when unset). */
export async function getLang(): Promise<Lang> {
  return parseLang((await cookies()).get(LANG_COOKIE)?.value);
}

export async function getStrings(): Promise<Strings> {
  return strings[await getLang()];
}
