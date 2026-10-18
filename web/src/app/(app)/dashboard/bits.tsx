'use client';

// Small dashboard pieces shared by every card: Card, CardHeader, CountUp, Tooltip, flash classes.

import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { timing } from '@design/tokens';
import { cx } from '@/components/ui';

export const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Live-change tint: on at once, fades back over timing.rowFlashFadeMs. */
export const flashBg = (on: boolean, rest = 'bg-surface') =>
  on ? 'bg-primary-soft' : cx(rest, 'transition-colors duration-1500 motion-reduce:transition-none');

export function Card({ children, className, labelledBy }: { children: ReactNode; className?: string; labelledBy?: string }) {
  return (
    <section
      aria-labelledby={labelledBy}
      className={cx('bg-surface border border-border rounded-xl shadow-sm min-w-0', className)}
    >
      {children}
    </section>
  );
}

export function CardHeader({
  id,
  title,
  subtitle,
  icon,
  right,
  border = false,
  wrap = false,
  className,
}: {
  id: string;
  title: string;
  subtitle: string;
  icon?: ReactNode;
  right?: ReactNode;
  border?: boolean;
  /** Let `right` drop under the title when it doesn't fit (Sales by hour's "Busiest"). */
  wrap?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cx(
        'px-4 md:px-5 pt-5 pb-4',
        !!right && (wrap ? 'flex flex-wrap items-start justify-between gap-x-4 gap-y-1' : 'flex items-start justify-between gap-3'),
        border && 'border-b border-border',
        className,
      )}
    >
      <div className="min-w-0">
        <h2 id={id} className={cx('text-lg font-bold text-text', !!icon && 'flex items-center gap-2')}>
          {icon}
          {title}
        </h2>
        <p className="mt-1 text-sm text-text-muted">{subtitle}</p>
      </div>
      {right}
    </div>
  );
}

/**
 * A number that counts from its previous value to the new one (ease-out, timing.countUpMs).
 * The text node is written directly each frame; React only ever writes the final value.
 * `format` must be a stable (module-level) function.
 */
export function CountUp({ value, animate, format }: { value: number; animate: boolean; format: (n: number) => string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const prev = useRef(value);
  useLayoutEffect(() => {
    const from = prev.current;
    prev.current = value;
    const el = ref.current;
    if (!el || from === value || !animate || reducedMotion()) return;
    const start = performance.now();
    let raf = 0;
    const step = (t: number) => {
      const p = Math.min(1, (t - start) / timing.countUpMs);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = format(Math.round(from + (value - from) * eased));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    el.textContent = format(from);
    raf = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(raf);
      el.textContent = format(value);
    };
  }, [value, animate, format]);
  return <span ref={ref}>{format(value)}</span>;
}

/** Hover / focus tooltip: value line, then a muted label line. Placed by the caller. */
export function Tooltip({
  id,
  value,
  label,
  style,
  className,
}: {
  id: string;
  value: string;
  label: string;
  style?: React.CSSProperties;
  className?: string;
}) {
  return (
    <div
      id={id}
      role="tooltip"
      style={style}
      className={cx(
        'absolute z-10 pointer-events-none bg-surface border border-border rounded-md shadow-md px-3 py-2 whitespace-nowrap',
        className,
      )}
    >
      <p className="text-sm font-semibold text-text tabular-nums">{value}</p>
      <p className="text-xs text-text-muted">{label}</p>
    </div>
  );
}

/** Horizontal placement for a tooltip centred on `centerPct` of its container, kept inside it. */
export function clampX(centerPct: number): { style: React.CSSProperties; className: string } {
  if (centerPct < 15) return { style: { left: 0 }, className: '' };
  if (centerPct > 85) return { style: { right: 0 }, className: '' };
  return { style: { left: `${centerPct}%` }, className: '-translate-x-1/2' };
}
