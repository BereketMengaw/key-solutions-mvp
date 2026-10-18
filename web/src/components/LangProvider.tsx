'use client';

import { useRouter } from 'next/navigation';
import { createContext, useContext, useTransition, type ReactNode } from 'react';
import { LANG_COOKIE, LANG_COOKIE_MAX_AGE, type Lang } from '@/lib/i18n';
import { strings, type Strings } from '@/lib/strings';

const LangContext = createContext<Lang>('en');

/** Set by the root layout from the cookie, so the first paint is already in the right language. */
export function LangProvider({ lang, children }: { lang: Lang; children: ReactNode }) {
  return <LangContext.Provider value={lang}>{children}</LangContext.Provider>;
}

export function useLang(): Lang {
  return useContext(LangContext);
}

export function useStrings(): Strings {
  return strings[useContext(LangContext)];
}

/** Writes the cookie and re-renders the server tree in the new language. */
export function useSetLang(): { setLang: (lang: Lang) => void; pending: boolean } {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const setLang = (lang: Lang) => {
    document.cookie = `${LANG_COOKIE}=${lang}; path=/; max-age=${LANG_COOKIE_MAX_AGE}; samesite=lax`;
    document.documentElement.lang = lang;
    startTransition(() => router.refresh());
  };
  return { setLang, pending };
}
