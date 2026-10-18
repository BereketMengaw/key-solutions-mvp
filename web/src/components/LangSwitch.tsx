'use client';

// "EN | አማ" — each language in its own script, so it reads right whichever one is showing.

import { cx } from '@/components/ui';
import { useLang, useSetLang, useStrings } from '@/components/LangProvider';
import { LANGS } from '@/lib/i18n';
import { LANG_NAMES } from '@/lib/strings';

export function LangSwitch({ className }: { className?: string }) {
  const lang = useLang();
  const s = useStrings();
  const { setLang, pending } = useSetLang();
  return (
    <div
      role="group"
      aria-label={s.lang.label}
      aria-busy={pending || undefined}
      className={cx('inline-flex items-center h-10 rounded-full bg-surface-muted p-1 text-sm font-semibold', className)}
    >
      {LANGS.map((l, i) => (
        <span key={l} className="flex items-center">
          {i > 0 && (
            <span aria-hidden="true" className="px-1 text-text-subtle">
              |
            </span>
          )}
          <button
            type="button"
            lang={l}
            aria-pressed={lang === l}
            aria-label={LANG_NAMES[l].long}
            disabled={pending}
            onClick={() => lang !== l && setLang(l)}
            className={cx(
              'h-8 min-w-10 px-3 rounded-full transition-colors motion-reduce:transition-none disabled:cursor-wait',
              lang === l ? 'bg-surface text-text shadow-sm' : 'text-text-muted hover:text-text',
            )}
          >
            {LANG_NAMES[l].short}
          </button>
        </span>
      ))}
    </div>
  );
}
