'use client';

// Left group: Sales by hour, Top items today, Payment mix. Plain HTML/CSS marks, no chart library.

import { useState, type KeyboardEvent } from 'react';
import { dashboard } from '@design/tokens';
import { PAYMENT_METHODS, type PaymentMethod } from '@shared/constants';
import type { DashboardToday } from '@shared/dashboard';
import { LoadingRegion, Skeleton, cx } from '@/components/ui';
import {
  addisHour,
  formatEtb,
  formatEtbCompact,
  formatEtbNumber,
  formatHour,
  formatHourRange,
  sharePercents,
} from '@/lib/format';
import { s } from '@/lib/strings';
import { Card, CardHeader, Tooltip, clampX, flashBg } from './bits';

const t = s.dashboard;

/* ---------------------------------------------------------------- Sales by hour */

const NICE = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8];

/** Smallest of 1K, 1.5K, 2K, 2.5K, 3K, 4K, 5K, 6K, 8K, 10K, 15K… that is ≥ peak × 1.15 and ≥ axisMinEtb. */
export function axisMax(peak: number): number {
  const need = Math.max(peak * 1.15, dashboard.axisMinEtb);
  for (let scale = 1000; ; scale *= 10) {
    for (const n of NICE) if (n * scale >= need) return n * scale;
  }
}

export function SalesByHour({
  hours,
  paidOrders,
  now,
  flashes,
}: {
  hours: DashboardToday['sales_by_hour'];
  paidOrders: number;
  now: number;
  flashes: ReadonlySet<string>;
}) {
  const [active, setActive] = useState<number | null>(null);

  const nowHour = addisHour(now);
  const sales = new Map(hours.map((h) => [h.hour, h.sales_etb]));
  const withSales = hours.filter((h) => h.sales_etb > 0).map((h) => h.hour).sort((a, b) => a - b);
  const start = Math.min(dashboard.dayStartHour, nowHour, ...withSales);
  const end = Math.max(dashboard.dayEndHour, nowHour + 1, ...withSales.map((h) => h + 1));
  const slots = Array.from({ length: end - start }, (_, i) => start + i);
  const n = slots.length;
  const empty = paidOrders === 0 || withSales.length === 0;

  let peakHour: number | null = null;
  for (const h of withSales) if (peakHour === null || (sales.get(h) ?? 0) >= (sales.get(peakHour) ?? 0)) peakHour = h;
  const peak = peakHour === null ? 0 : (sales.get(peakHour) ?? 0);
  const max = axisMax(peak);
  const pctOf = (v: number) => Math.max(1.5, (v / max) * 100);
  const center = (h: number) => ((slots.indexOf(h) + 0.5) / n) * 100;

  const everyThird = n > 18;
  const labelClass = (h: number): string | null => {
    if (h === nowHour) return 'block';
    if (h === nowHour - 1 || h === nowHour + 1) return null;
    const md = everyThird ? h % 3 === 0 : h % 2 === 0;
    const sm = h % 3 === 0;
    if (md && sm) return 'block';
    if (md) return 'hidden md:block';
    if (sm) return 'md:hidden';
    return null;
  };

  const shownActive = active !== null && (sales.get(active) ?? 0) > 0 ? active : null;
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') return setActive(null);
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    if (shownActive === null) return setActive(peakHour);
    const i = withSales.indexOf(shownActive);
    const next = e.key === 'ArrowRight' ? Math.min(withSales.length - 1, i + 1) : Math.max(0, i - 1);
    setActive(withSales[next]);
  };

  const busiest = withSales.length >= 2 && peakHour !== null;
  const tip = shownActive !== null ? clampX(center(shownActive)) : null;

  return (
    <Card labelledBy="hours-title">
      <CardHeader
        id="hours-title"
        title={t.hours.title}
        subtitle={t.hours.subtitle}
        wrap
        right={
          busiest ? (
            <p className="text-sm text-text-muted tabular-nums" data-busiest>
              <span className="font-semibold text-text">{t.hours.busiest}</span>{' '}
              {t.hours.busiestValue(formatHour(peakHour!), formatEtbNumber(peak))}
            </p>
          ) : undefined
        }
      />
      <div className="px-4 md:px-5 pb-5">
        <div className="flex">
          <div aria-hidden="true" className="w-10 flex-none relative h-chart-plot-sm md:h-chart-plot">
            {!empty &&
              [0, max / 2, max].map((v) => (
                <span
                  key={v}
                  className="absolute right-2 translate-y-1/2 text-xs text-text-subtle tabular-nums"
                  style={{ bottom: `${(v / max) * 100}%` }}
                >
                  {formatEtbCompact(v)}
                </span>
              ))}
          </div>
          <div
            className="relative flex-1 min-w-0 h-chart-plot-sm md:h-chart-plot rounded-sm"
            {...(empty
              ? { 'aria-hidden': true }
              : {
                  tabIndex: 0,
                  role: 'group',
                  'aria-label': t.hours.groupAria,
                  'aria-describedby': shownActive !== null ? 'hours-tip' : undefined,
                  onKeyDown,
                  onBlur: () => setActive(null),
                  onPointerLeave: (e: React.PointerEvent) => {
                    if (e.pointerType === 'mouse') setActive(null);
                  },
                })}
          >
            {!empty &&
              [max / 2, max].map((v) => (
                <span
                  key={v}
                  aria-hidden="true"
                  className="absolute inset-x-0 border-t border-border"
                  style={{ bottom: `${(v / max) * 100}%` }}
                />
              ))}
            <span aria-hidden="true" className="absolute inset-x-0 bottom-0 border-t border-border-strong" />
            <div aria-hidden="true" className="absolute inset-0 flex items-end">
              {slots.map((h) => {
                const v = sales.get(h) ?? 0;
                const isNow = h === nowHour;
                const on = shownActive === h;
                const flash = flashes.has(`hour:${h}`);
                return (
                  <div
                    key={h}
                    data-hour={h}
                    className={cx('relative flex-1 h-full flex items-end justify-center', isNow && 'bg-surface-muted rounded-t-md')}
                    onPointerEnter={(e) => {
                      if (e.pointerType === 'mouse') setActive(v > 0 ? h : null);
                    }}
                    onClick={() => setActive(v > 0 ? h : null)}
                  >
                    {!empty && v > 0 && (
                      <div
                        data-bar={h}
                        className={cx(
                          'relative w-3/5 max-w-hour-bar rounded-t-bar motion-reduce:transition-none',
                          flash
                            ? 'bg-primary [transition:height_400ms_ease-out]'
                            : cx(
                                on ? 'bg-chart-bar-active' : 'bg-chart-bar',
                                '[transition:height_400ms_ease-out,background-color_1500ms]',
                              ),
                        )}
                        style={{ height: `${pctOf(v)}%` }}
                      >
                        {h === peakHour && (
                          <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 text-xs font-semibold text-text tabular-nums whitespace-nowrap">
                            {formatEtbNumber(v)}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {empty && (
              <div className="absolute inset-0 grid place-items-center text-center px-6">
                <div>
                  <p className="text-md font-semibold text-text">{t.hours.empty}</p>
                  <p className="mt-1 text-sm text-text-muted">{t.hours.emptyBody}</p>
                </div>
              </div>
            )}
            {shownActive !== null && tip && (
              <Tooltip
                id="hours-tip"
                value={formatEtb(sales.get(shownActive) ?? 0)}
                label={formatHourRange(shownActive)}
                className={cx('mb-2', tip.className)}
                style={{ ...tip.style, bottom: `${pctOf(sales.get(shownActive) ?? 0)}%` }}
              />
            )}
          </div>
        </div>
        <div aria-hidden="true" className="relative h-6 mt-2 ml-10">
          {slots.map((h) => {
            const cls = labelClass(h);
            if (!cls) return null;
            const isNow = h === nowHour;
            return (
              <span
                key={h}
                className={cx(
                  'absolute -translate-x-1/2 text-xs tabular-nums whitespace-nowrap',
                  isNow ? 'font-semibold text-text' : 'text-text-subtle',
                  cls,
                )}
                style={{ left: `${center(h)}%` }}
              >
                {isNow ? t.hours.now : formatHour(h)}
              </span>
            );
          })}
        </div>
        {!empty && (
          <table className="sr-only">
            <caption>{t.hours.tableCaption}</caption>
            <thead>
              <tr>
                <th scope="col">{t.hours.hour}</th>
                <th scope="col">{t.hours.sales}</th>
              </tr>
            </thead>
            <tbody>
              {withSales.map((h) => (
                <tr key={h}>
                  <td>{formatHourRange(h)}</td>
                  <td>{formatEtb(sales.get(h) ?? 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Card>
  );
}

/* ---------------------------------------------------------------- Top items */

export function TopItems({
  items,
  ordersToday,
  flashes,
}: {
  items: DashboardToday['top_items'];
  ordersToday: number;
  flashes: ReadonlySet<string>;
}) {
  const rows = items.slice(0, dashboard.topItems);
  const top = Math.max(1, ...rows.map((r) => r.quantity));
  return (
    <Card labelledBy="top-title">
      <CardHeader id="top-title" title={t.top.title} subtitle={t.top.subtitle} />
      {ordersToday === 0 || rows.length === 0 ? (
        <div className="px-4 md:px-5 pb-6 pt-2 text-center">
          <p className="text-md font-semibold text-text">{t.top.empty}</p>
          <p className="mt-1 text-sm text-text-muted">{t.top.emptyBody}</p>
        </div>
      ) : (
        <ol aria-label={t.top.title} className="px-2 md:px-3 pb-3 flex flex-col gap-1">
          {rows.map((r, i) => (
            <li
              key={r.menu_item_id}
              data-item={r.name}
              className={cx('px-2 py-1.5 rounded-md', flashBg(flashes.has(`item:${r.menu_item_id}`), 'bg-transparent'))}
            >
              <span className="sr-only">{t.top.aria(i + 1, r.name, r.quantity, formatEtbNumber(r.revenue_etb))}</span>
              <div aria-hidden="true">
                <div className="flex items-baseline gap-3">
                  <span className="w-5 flex-none text-sm font-semibold text-text-subtle tabular-nums">{i + 1}</span>
                  <span className="min-w-0 flex-1 text-md font-semibold text-text">{r.name}</span>
                  <span className="text-md font-semibold text-text tabular-nums">{t.top.qty(r.quantity)}</span>
                  <span className="text-sm text-text-muted tabular-nums whitespace-nowrap">{formatEtb(r.revenue_etb)}</span>
                </div>
                <div className="mt-2 ml-8">
                  <div
                    className="h-item-bar rounded-r-full bg-chart-bar transition-[width] duration-400 motion-reduce:transition-none"
                    style={{ width: `${Math.max(2, (r.quantity / top) * 100)}%` }}
                  />
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}

/* ---------------------------------------------------------------- Payment mix */

const SWATCH: Record<PaymentMethod, string> = {
  cash: 'bg-payment-cash',
  telebirr: 'bg-payment-telebirr',
  cbe_birr: 'bg-payment-cbe-birr',
};

export function PaymentMix({
  mix,
  paidOrders,
  flashes,
}: {
  mix: DashboardToday['payment_mix'];
  paidOrders: number;
  flashes: ReadonlySet<string>;
}) {
  const [hover, setHover] = useState<PaymentMethod | null>(null);
  const rows = PAYMENT_METHODS.map((method) => {
    const r = mix.find((m) => m.method === method);
    return { method, sales: r?.sales_etb ?? 0, orders: r?.orders ?? 0 };
  });
  const total = rows.reduce((a, r) => a + r.sales, 0);
  const shares = sharePercents(rows.map((r) => r.sales));

  const paid = rows.filter((r) => r.sales > 0);
  const segments = paid.map((r, i) => {
    const before = paid.slice(0, i).reduce((a, p) => a + p.sales, 0);
    const width = (r.sales / total) * 100;
    return { ...r, width, center: (before / total) * 100 + width / 2 };
  });
  const hovered = segments.find((g) => g.method === hover);
  const tip = hovered ? clampX(hovered.center) : null;

  return (
    <Card labelledBy="mix-title">
      <CardHeader id="mix-title" title={t.mix.title} subtitle={t.mix.subtitle} />
      {paidOrders === 0 || total === 0 ? (
        <div className="px-4 md:px-5 pb-6 pt-2 text-center">
          <p className="text-md font-semibold text-text">{t.mix.empty}</p>
          <p className="mt-1 text-sm text-text-muted">{t.mix.emptyBody}</p>
        </div>
      ) : (
        <div className="px-4 md:px-5 pb-5">
          <div className="relative">
            <div aria-hidden="true" className="flex w-full h-mix-bar rounded-full overflow-hidden">
              {segments.map((g, i) => (
                <div
                  key={g.method}
                  data-segment={g.method}
                  onPointerEnter={() => setHover(g.method)}
                  onPointerLeave={() => setHover(null)}
                  className={cx(
                    SWATCH[g.method],
                    i > 0 && 'border-l-2 border-surface',
                    'transition-[width] duration-400 motion-reduce:transition-none',
                  )}
                  style={{ width: `${g.width}%` }}
                />
              ))}
            </div>
            {hovered && tip && (
              <Tooltip
                id="mix-tip"
                value={formatEtb(hovered.sales)}
                label={t.mix.tooltip(t.mix.method[hovered.method], hovered.orders)}
                className={cx('bottom-full mb-2', tip.className)}
                style={tip.style}
              />
            )}
          </div>
          <ul className="mt-5 flex flex-col gap-3">
            {rows.map((r, i) => {
              const none = r.sales === 0;
              const flash = flashes.has(`pay:${r.method}`);
              return (
                <li
                  key={r.method}
                  data-method={r.method}
                  onPointerEnter={() => setHover(none ? null : r.method)}
                  onPointerLeave={() => setHover(null)}
                  className={cx(
                    'flex items-center gap-3 -mx-2 px-2 rounded-md',
                    flash ? 'bg-primary-soft' : hover === r.method ? 'bg-surface-muted' : flashBg(false, 'bg-transparent'),
                  )}
                >
                  <span aria-hidden="true" className={cx('size-3 flex-none rounded-sm', SWATCH[r.method])} />
                  <span className="flex-1 text-md text-text">{t.mix.method[r.method]}</span>
                  <span className={cx('text-md font-semibold tabular-nums whitespace-nowrap', none ? 'text-text-subtle' : 'text-text')}>
                    {formatEtb(r.sales)}
                  </span>
                  <span className={cx('w-12 text-right text-sm tabular-nums', none ? 'text-text-subtle' : 'text-text-muted')}>
                    {shares[i]}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </Card>
  );
}

/* ---------------------------------------------------------------- Skeletons */

export function ChartsSkeleton() {
  return (
    <>
      <Card labelledBy="hours-title">
        <CardHeader id="hours-title" title={t.hours.title} subtitle={t.hours.subtitle} />
        <LoadingRegion className="px-4 md:px-5 pb-5">
          <Skeleton className="h-chart-plot-sm md:h-chart-plot w-full rounded-md" />
        </LoadingRegion>
      </Card>
      <div className="grid gap-6 md:grid-cols-2">
        <Card labelledBy="top-title">
          <CardHeader id="top-title" title={t.top.title} subtitle={t.top.subtitle} />
          <div aria-hidden="true" className="px-4 md:px-5 pb-5 flex flex-col gap-4">
            {[0, 1, 2].map((n) => (
              <div key={n} className="flex flex-col gap-2">
                <Skeleton className="h-5 w-2/3 rounded-sm" />
                <Skeleton className="h-item-bar w-1/2 rounded-full" />
              </div>
            ))}
          </div>
        </Card>
        <Card labelledBy="mix-title">
          <CardHeader id="mix-title" title={t.mix.title} subtitle={t.mix.subtitle} />
          <div aria-hidden="true" className="px-4 md:px-5 pb-5 flex flex-col gap-3">
            <Skeleton className="h-mix-bar w-full rounded-full" />
            {[0, 1, 2].map((n) => (
              <Skeleton key={n} className="h-5 w-full rounded-sm" />
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}
