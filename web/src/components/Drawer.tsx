'use client';

// Side sheet on the native <dialog> (showModal gives the backdrop, Esc and an inert page).

import { useEffect, useId, useRef, type ReactNode } from 'react';
import { Icon } from '@/components/icons';
import { cx } from '@/components/ui';
import { s } from '@/lib/strings';

const EXIT_MS = 250; // timing.enterMs

export function Drawer({
  open,
  onClose,
  side = 'right',
  busy = false,
  title,
  subtitle,
  closeLabel = s.common.close,
  hideHeader = false,
  footer,
  children,
  initialFocusRef,
  returnFocusRef,
}: {
  open: boolean;
  onClose: () => void;
  side?: 'right' | 'left';
  /** While busy, Esc, backdrop and close are ignored. */
  busy?: boolean;
  title: string;
  subtitle?: string;
  closeLabel?: string;
  /** The nav drawer draws its own content; its title is sr-only. */
  hideHeader?: boolean;
  footer?: ReactNode;
  children: ReactNode;
  initialFocusRef?: React.RefObject<HTMLElement | null>;
  /** Where focus goes after closing (defaults to whatever had focus when it opened). */
  returnFocusRef?: React.RefObject<HTMLElement | null>;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const opener = useRef<Element | null>(null);
  const busyRef = useRef(busy);
  const closeRef = useRef(onClose);
  useEffect(() => {
    busyRef.current = busy;
    closeRef.current = onClose;
  });

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      opener.current = document.activeElement;
      dialog.showModal();
      initialFocusRef?.current?.focus();
      // Next frame: slide in (CSS transition on data-open).
      const raf = requestAnimationFrame(() => dialog.setAttribute('data-open', 'true'));
      return () => cancelAnimationFrame(raf);
    }
    if (!open && dialog.open) {
      dialog.setAttribute('data-open', 'false');
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const t = window.setTimeout(
        () => {
          dialog.close();
          const target = returnFocusRef?.current ?? opener.current;
          if (target instanceof HTMLElement && target.isConnected) target.focus();
        },
        reduce ? 0 : EXIT_MS,
      );
      return () => window.clearTimeout(t);
    }
  }, [open, initialFocusRef, returnFocusRef]);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const onCancel = (e: Event) => {
      e.preventDefault(); // we animate the close ourselves
      if (!busyRef.current) closeRef.current();
    };
    const onClick = (e: MouseEvent) => {
      // A click on the <dialog> itself (not its panel) is a backdrop click.
      if (e.target === dialog && !busyRef.current) closeRef.current();
    };
    dialog.addEventListener('cancel', onCancel);
    dialog.addEventListener('click', onClick);
    return () => {
      dialog.removeEventListener('cancel', onCancel);
      dialog.removeEventListener('click', onClick);
    };
  }, []);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      className={cx('drawer fixed inset-0 h-full w-full overflow-hidden', side === 'right' ? 'drawer-right' : 'drawer-left')}
    >
      <div
        className={cx(
          'drawer-panel fixed inset-y-0 h-full bg-surface shadow-lg flex flex-col',
          side === 'right' ? 'right-0 w-full md:w-drawer' : 'left-0 w-sidebar',
        )}
      >
        {hideHeader ? (
          <>
            <h2 id={titleId} className="sr-only">
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label={closeLabel}
              className="absolute top-3 right-3 size-12 rounded-full grid place-items-center text-text-muted hover:bg-surface-muted"
            >
              <Icon name="close" className="size-icon-lg" />
            </button>
          </>
        ) : (
          <div className="flex items-start justify-between gap-4 px-6 pt-6 pb-4 border-b border-border">
            <div className="min-w-0">
              <h2 id={titleId} className="text-xl font-bold text-text">
                {title}
              </h2>
              {subtitle && <p className="mt-1 text-sm text-text-muted">{subtitle}</p>}
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              aria-label={closeLabel}
              className="-mt-2 -mr-2 size-12 flex-none rounded-full grid place-items-center text-text-muted hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Icon name="close" className="size-icon-lg" />
            </button>
          </div>
        )}
        {children}
        {footer}
      </div>
    </dialog>
  );
}
