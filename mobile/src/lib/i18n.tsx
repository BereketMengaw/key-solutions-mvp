// Active language (English / Amharic), saved on the device. Default English.
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { StyleSheet, type StyleProp, type TextStyle } from 'react-native';

import { dictionaries, LANGUAGES, type Language, type Strings } from '@/strings';
import { ethiopicFamily } from '@/theme';
import { sessionStorage as deviceStorage } from './session-storage';

const STORAGE_KEY = 'ks.language';

type LanguageContextValue = { language: Language; setLanguage: (next: Language) => void };

const LanguageContext = createContext<LanguageContextValue | null>(null);

const isLanguage = (v: string | null): v is Language => (LANGUAGES as readonly string[]).includes(v ?? '');

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    deviceStorage
      .getItem(STORAGE_KEY)
      .then((saved) => {
        if (isLanguage(saved)) setLanguageState(saved);
      })
      .catch(() => {
        // Unreadable storage: stay on English.
      })
      .finally(() => setLoaded(true));
  }, []);

  const setLanguage = useCallback((next: Language) => {
    setLanguageState(next);
    deviceStorage.setItem(STORAGE_KEY, next).catch(() => {
      // Not saved: the switch still works for this session.
    });
  }, []);

  const value = useMemo(() => ({ language, setLanguage }), [language, setLanguage]);

  // Hold the first frame until the saved choice is known, so Amharic users never see English flash.
  if (!loaded) return null;
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used inside LanguageProvider');
  return ctx;
}

/** Every UI string in the active language. */
export function useT(): Strings {
  return dictionaries[useLanguage().language];
}

/** Menu/category name in the active language: `name_am` in Amharic, falling back to `name` when empty. */
export function useLocalName(): (name: string, nameAm: string | null | undefined) => string {
  const { language } = useLanguage();
  return useCallback(
    (name, nameAm) => (language === 'am' && nameAm && nameAm.trim() ? nameAm.trim() : name),
    [language],
  );
}

/** Swaps Noto Sans for Noto Sans Ethiopic (same weight) when the app is in Amharic. */
export function useLocalFont(): (style: StyleProp<TextStyle>) => StyleProp<TextStyle> {
  const { language } = useLanguage();
  return useCallback(
    (style) => {
      if (language !== 'am') return style;
      const family = StyleSheet.flatten(style)?.fontFamily;
      const swap = family ? ethiopicFamily[family] : undefined;
      return swap ? [style, { fontFamily: swap }] : style;
    },
    [language],
  );
}
