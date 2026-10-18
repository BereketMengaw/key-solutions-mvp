'use client';

// Stock page pieces: LivePill, StatTile, LevelBar, StatusChip, SegmentedControl, Search, Toast.

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { timing } from '@design/tokens';
import { Icon, type IconName } from '@/components/icons';
import { Spinner, cx } from '@/components/ui';
import { isLow, isOut, levelPct, tickPct } from '@/lib/format';
import type { Connection } from '@/lib/stock/StockProvider';
import { useStrings } from '@/components/LangProvider';

/* ---------------------------------------------------------------- LivePill */

export function LivePill({ state }: { state: Connection }) {
  const c = useStrings().stock.connection;
  const look = {
    connecting: { cls: 'bg-surface-muted text-text-muted', label: c.connecting },
    live: { cls: 'bg-success-soft text-success', label: c.live },
    reconnecting: { cls: 'bg-warning-soft text-warning', label: c.reconnecting },
    offline: { cls: 'bg-danger-soft text-danger', label: c.offline },
  }[state];
  return (
    <span role="status" className={cx('inline-flex items-center h-10 px-4 rounded-full gap-2 text-sm font-semibold whitespace-nowrap', look.cls)}>
      {state === 'live' ? (
        <span aria-hidden="true" className="size-2 rounded-full bg-success" />
      ) : state === 'offline' ? (
        <Icon name="cloud-offline-outline" className="size-icon-sm" />
      ) : (
        <Spinner />
      )}
      {look.label}
    </span>
  );
}

/* ---------------------------------------------------------------- StatTile */

export function StatTile({
  icon,
  label,
  value,
  caption,
  alert = false,
  flash = false,
  className,
  valueClass = 'text-3xl',
  inline = false,
  button,
}: {
  icon: IconName;
  label: string;
  value: ReactNode;
  caption: ReactNode;
  alert?: boolean;
  flash?: boolean;
  className?: string;
  valueClass?: string;
  /** Phone "Last change": value and caption on one line. */
  inline?: boolean;
  button?: { pressed: boolean; onClick: () => void; ariaLabel: string };
}) {
  const body = (
    <>
      <span className={cx('flex items-center gap-2 text-sm font-semibold', alert ? 'text-status-low-stock-fg' : 'text-text-muted')}>
        <Icon name={icon} className="size-icon" />
        {label}
      </span>
      {inline ? (
        <span className="mt-1 flex items-baseline gap-1 min-w-0">
          <span className="text-lg font-bold tabular-nums text-text whitespace-nowrap">{value}</span>
          <span className="text-sm text-text-muted truncate">· {caption}</span>
        </span>
      ) : (
        <>
          <span className={cx('mt-1 font-bold tabular-nums', valueClass, alert ? 'text-status-low-stock-fg' : 'text-text')}>{value}</span>
          <span className={cx('text-sm line-clamp-2', alert ? 'text-text' : 'text-text-muted')}>{caption}</span>
        </>
      )}
    </>
  );
  const cls = cx(
    'rounded-xl border shadow-sm p-4 md:p-5 flex flex-col gap-1 text-left min-w-0 transition-[box-shadow,background-color] motion-reduce:transition-none',
    alert ? 'bg-status-low-stock-bg border-status-low-stock-fg/30' : 'bg-surface border-border',
    flash && 'ring-2 ring-status-low-stock-fg',
    className,
  );
  if (button) {
    return (
      <button
        type="button"
        aria-pressed={button.pressed}
        aria-label={button.ariaLabel}
        onClick={button.onClick}
        className={cx(
          cls,
          'hover:shadow-md',
          button.pressed && 'ring-2 ring-status-low-stock-fg ring-offset-2 ring-offset-background',
        )}
      >
        {body}
      </button>
    );
  }
  return <div className={cls}>{body}</div>;
}

/* ---------------------------------------------------------------- LevelBar */

export function LevelBar({ quantity, threshold }: { quantity: number; threshold: number }) {
  const low = isLow(quantity, threshold);
  const pct = levelPct(quantity, threshold);
  return (
    <div aria-hidden="true" className="relative h-level-tick w-full flex items-center">
      <div className="h-level-bar w-full rounded-full bg-level-track overflow-hidden">
        <div
          className={cx(
            'h-full rounded-full transition-[width,background-color] duration-400 ease-out motion-reduce:transition-none',
            low ? 'bg-level-fill-low' : 'bg-level-fill',
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      {threshold > 0 && (
        <span
          className="absolute top-0 h-level-tick w-level-tick-width rounded-full bg-level-tick -translate-x-1/2"
          style={{ left: `${tickPct}%` }}
        />
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- StatusChip */

export function StatusChip({ quantity, threshold }: { quantity: number; threshold: number }) {
  const s = useStrings();
  if (isOut(quantity) && threshold > 0) {
    return (
      <span className="inline-flex items-center gap-1 py-1 px-3 rounded-full text-sm font-semibold bg-danger text-text-on-overdue">
        <Icon name="alert-circle" className="size-icon-sm" />
        {s.stock.table.chipOut}
      </span>
    );
  }
  if (isLow(quantity, threshold)) {
    return (
      <span className="inline-flex items-center gap-1 py-1 px-3 rounded-full text-sm font-semibold bg-status-low-stock-bg text-status-low-stock-fg">
        <Icon name="warning-outline" className="size-icon-sm" />
        {s.stock.table.chipLow}
      </span>
    );
  }
  return <span className="sr-only">{s.stock.table.inStock}</span>;
}

/* ---------------------------------------------------------------- SegmentedControl */

export function LowFilter({
  lowOnly,
  onChange,
  total,
  lowCount,
  className,
}: {
  lowOnly: boolean;
  onChange: (lowOnly: boolean) => void;
  total: number;
  lowCount: number;
  className?: string;
}) {
  const s = useStrings();
  const opt = (active: boolean) =>
    cx(
      'h-10 px-4 rounded-md text-sm font-semibold flex items-center justify-center gap-2 transition-colors motion-reduce:transition-none',
      active ? 'bg-surface text-text shadow-sm' : 'text-text-muted hover:text-text',
    );
  return (
    <div role="group" aria-label={s.stock.show} className={cx('inline-flex h-12 p-1 gap-1 rounded-lg bg-surface-muted', className)}>
      <button type="button" aria-pressed={!lowOnly} onClick={() => onChange(false)} className={cx(opt(!lowOnly), 'flex-1')}>
        {s.stock.all} <span className="text-text-subtle tabular-nums">{total}</span>
      </button>
      <button type="button" aria-pressed={lowOnly} onClick={() => onChange(true)} className={cx(opt(lowOnly), 'flex-1')}>
        {s.stock.low}
        {lowCount > 0 ? (
          <span className="min-w-6 h-6 px-2 rounded-full bg-status-low-stock-bg text-status-low-stock-fg text-xs font-bold tabular-nums grid place-items-center">
            {lowCount}
          </span>
        ) : (
          <span className="text-text-subtle tabular-nums">0</span>
        )}
      </button>
    </div>
  );
}

/* ---------------------------------------------------------------- Search */

export function SearchField({
  value,
  onChange,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  const s = useStrings();
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className={cx('relative', className)}>
      <Icon name="search-outline" className="size-icon text-text-muted absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
      <input
        ref={ref}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={s.stock.search}
        aria-label={s.stock.search}
        autoComplete="off"
        className={cx(
          'h-12 w-full rounded-md bg-surface pl-12 pr-12 text-md text-text placeholder:text-text-subtle outline-none border-[1.5px] border-border-control',
          'hover:border-text-muted focus:border-focus-ring focus:ring-[0.5px] focus:ring-inset focus:ring-focus-ring',
          '[&::-webkit-search-cancel-button]:appearance-none',
        )}
      />
      {value && (
        <button
          type="button"
          aria-label={s.stock.clearSearch}
          onClick={() => {
            onChange('');
            ref.current?.focus();
          }}
          className="absolute right-1 top-1/2 -translate-y-1/2 size-10 grid place-items-center rounded-md text-text-muted hover:text-text"
        >
          <Icon name="close" className="size-icon" />
        </button>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- Toast */

export type ToastMsg = { id: number; title: string; body: string };

export function Toast({ toast, onDismiss }: { toast: ToastMsg | null; onDismiss: () => void }) {
  const s = useStrings();
  const [shown, setShown] = useState(false);
  const paused = useRef(false);
  const remaining = useRef<number>(timing.toastMs);
  const timer = useRef<number | undefined>(undefined);
  const startedAt = useRef(0);
  const dismissRef = useRef(onDismiss);
  useEffect(() => {
    dismissRef.current = onDismiss;
  });

  useEffect(() => {
    if (!toast) return;
    remaining.current = timing.toastMs;
    const raf = requestAnimationFrame(() => setShown(true));
    startedAt.current = Date.now();
    timer.current = window.setTimeout(() => dismissRef.current(), remaining.current);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(timer.current);
      setShown(false);
    };
  }, [toast]);

  const pause = () => {
    if (paused.current) return;
    paused.current = true;
    window.clearTimeout(timer.current);
    remaining.current -= Date.now() - startedAt.current;
  };
  const resume = () => {
    if (!paused.current) return;
    paused.current = false;
    startedAt.current = Date.now();
    timer.current = window.setTimeout(() => dismissRef.current(), Math.max(remaining.current, 1000));
  };

  return (
    <div role="status" aria-live="polite" className="fixed z-50 bottom-[calc(var(--spacing-phone-action-bar)+var(--spacing-2))] inset-x-4 md:inset-x-auto md:bottom-6 md:right-6 md:w-drawer pointer-events-none">
      {toast && (
        <div
          onMouseEnter={pause}
          onMouseLeave={resume}
          onFocus={pause}
          onBlur={resume}
          className={cx(
            'pointer-events-auto bg-surface border border-border rounded-lg shadow-lg p-4 flex items-start gap-3',
            'transition-[opacity,translate] duration-250 motion-reduce:transition-none',
            shown ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0',
          )}
        >
          <Icon name="checkmark-circle" className="size-icon-lg text-success" />
          <div className="min-w-0 flex-1">
            <p className="text-md font-semibold text-text">{toast.title}</p>
            <p className="text-sm text-text-muted">{toast.body}</p>
          </div>
          <button
            type="button"
            onClick={onDismiss}
            aria-label={s.common.dismiss}
            className="-m-2 size-10 flex-none grid place-items-center rounded-md text-text-muted hover:bg-surface-muted"
          >
            <Icon name="close" className="size-icon" />
          </button>
        </div>
      )}
    </div>
  );
}
