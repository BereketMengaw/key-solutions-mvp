'use client';

// Right group: Live floor (open orders by status) and Stock alerts (from StockProvider).

import Link from 'next/link';
import { dashboard, timing } from '@design/tokens';
import type { OpenOrderStatus } from '@shared/dashboard';
import { Icon, type IconName } from '@/components/icons';
import { Banner, Button, LoadingRegion, Skeleton, cx } from '@/components/ui';
import type { LiveRow } from '@/lib/dashboard/useDashboard';
import { formatQuantity, formatWait, isLow, isOut, minutesSince } from '@/lib/format';
import { useStock, type Ingredient } from '@/lib/stock/StockProvider';
import { s } from '@/lib/strings';
import { StatusChip } from '../stock/parts';
import { Card, CardHeader, flashBg } from './bits';

const t = s.dashboard;

/** Pipeline order; the owner sees the waiter's words. Keyed by status so a new status fails typecheck. */
const GROUPS: Record<OpenOrderStatus, { icon: IconName; chip: string }> = {
  sent: { icon: 'paper-plane-outline', chip: 'bg-status-sent-bg text-status-sent-fg' },
  preparing: { icon: 'flame-outline', chip: 'bg-status-preparing-bg text-status-preparing-fg' },
  ready: { icon: 'checkmark-circle-outline', chip: 'bg-status-ready-bg text-status-ready-fg' },
  served: { icon: 'restaurant-outline', chip: 'bg-status-served-bg text-status-served-fg' },
};
const ORDER = Object.keys(GROUPS) as OpenOrderStatus[];

/** Late = still with the kitchen (sent / preparing) and waiting ≥ timing.overdueAfterMinutes. */
export function isLate(row: Pick<LiveRow, 'status' | 'created_at'>, now: number): boolean {
  return (
    (row.status === 'sent' || row.status === 'preparing') &&
    minutesSince(row.created_at, now) >= timing.overdueAfterMinutes
  );
}

export function StatusBadge({ status }: { status: OpenOrderStatus }) {
  const g = GROUPS[status];
  return (
    <span className={cx('inline-flex items-center gap-1 py-1 px-3 rounded-full text-sm font-semibold', g.chip)}>
      <Icon name={g.icon} className="size-icon-sm" />
      {t.floor.status[status]}
    </span>
  );
}

export function LiveFloor({
  rows,
  leaving,
  now,
  flashes,
  entered,
}: {
  rows: LiveRow[];
  leaving: LiveRow[];
  now: number;
  flashes: ReadonlySet<string>;
  entered: ReadonlySet<string>;
}) {
  const leavingIds = new Set(leaving.map((r) => r.id));
  const shown = [...rows.filter((r) => !leavingIds.has(r.id)), ...leaving].sort(
    (a, b) => a.created_at.localeCompare(b.created_at) || a.id - b.id,
  );

  return (
    <Card labelledBy="floor-title" className="overflow-hidden">
      <CardHeader id="floor-title" title={t.floor.title} subtitle={t.floor.subtitle} border />
      {shown.length === 0 ? (
        <div className="px-5 py-8 text-center">
          <Icon name="restaurant-outline" className="size-icon-xl text-text-subtle mx-auto" />
          <p className="mt-3 text-md font-semibold text-text">{t.floor.empty}</p>
          <p className="mt-1 text-sm text-text-muted max-w-text-block mx-auto">{t.floor.emptyBody}</p>
        </div>
      ) : (
        ORDER.map((status, n) => {
          const group = shown.filter((r) => r.status === status);
          const count = group.filter((r) => !leavingIds.has(r.id)).length;
          const headId = `floor-${status}`;
          return (
            <section
              key={status}
              aria-labelledby={headId}
              data-group={status}
              className={cx(n > 0 && 'border-t border-border', group.length > 0 && 'pb-2')}
            >
              <div className="flex items-center justify-between px-4 md:px-5 pt-4 pb-2">
                <h3 id={headId}>
                  <StatusBadge status={status} />
                </h3>
                <span
                  data-count
                  className={cx('text-sm font-semibold tabular-nums', count > 0 ? 'text-text' : 'text-text-subtle')}
                >
                  {count}
                  <span className="sr-only">{t.floor.openSuffix}</span>
                </span>
              </div>
              {group.length > 0 && (
                <ul className="divide-y divide-border">
                  {group.map((r) => (
                    <FloorRow
                      key={r.id}
                      row={r}
                      now={now}
                      flash={flashes.has(`order:${r.id}`)}
                      enter={entered.has(`order:${r.id}`)}
                      leaving={leavingIds.has(r.id)}
                    />
                  ))}
                </ul>
              )}
            </section>
          );
        })
      )}
    </Card>
  );
}

function FloorRow({
  row,
  now,
  flash,
  enter,
  leaving,
}: {
  row: LiveRow;
  now: number;
  flash: boolean;
  enter: boolean;
  leaving: boolean;
}) {
  const minutes = minutesSince(row.created_at, now);
  const wait = formatWait(minutes);
  const late = isLate(row, now);
  const waiter = row.waiter_name || null;
  return (
    <li
      data-order={row.id}
      aria-label={t.floor.rowAria(row.table_number, row.id, row.item_count, waiter, minutes, late)}
      className={cx(
        'px-4 md:px-5 py-3 flex items-start gap-3',
        flashBg(flash),
        enter && 'dash-enter',
        leaving && 'opacity-0 transition-opacity duration-250 motion-reduce:transition-none',
      )}
    >
      <div className="min-w-0 flex-1" aria-hidden="true">
        <p className="text-md font-semibold text-text">{t.floor.table(row.table_number)}</p>
        <p className="text-sm text-text-muted">{t.floor.meta(row.id, row.item_count, waiter)}</p>
      </div>
      <div className="flex-none" aria-hidden="true">
        {late ? (
          <span className="inline-flex items-center gap-1 py-1 px-3 rounded-full text-sm font-semibold bg-overdue text-text-on-overdue whitespace-nowrap tabular-nums">
            <Icon name="alert-circle" className="size-icon-sm" />
            {t.floor.late(wait)}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-sm tabular-nums text-text-muted whitespace-nowrap">
            <Icon name="time-outline" className="size-icon-sm" />
            {wait}
          </span>
        )}
      </div>
    </li>
  );
}

export function FloorSkeleton() {
  return (
    <Card labelledBy="floor-title" className="overflow-hidden">
      <CardHeader id="floor-title" title={t.floor.title} subtitle={t.floor.subtitle} border />
      <LoadingRegion>
        {[0, 1].map((n) => (
          <div key={n} className={cx('px-5 py-4 flex flex-col gap-2', n > 0 && 'border-t border-border')}>
            <Skeleton className="h-5 w-1/3 rounded-sm" />
            <Skeleton className="h-4 w-2/3 rounded-sm" />
          </div>
        ))}
      </LoadingRegion>
    </Card>
  );
}

/* ---------------------------------------------------------------- Stock alerts */

const urgency = (i: Ingredient) => (i.low_stock_threshold > 0 ? i.quantity_on_hand / i.low_stock_threshold : 0);

export function StockAlerts() {
  const { ingredients, ingredientsState, changes, retryIngredients } = useStock();
  const low = ingredients
    .filter((i) => isLow(i.quantity_on_hand, i.low_stock_threshold))
    .sort(
      (a, b) =>
        Number(isOut(b.quantity_on_hand)) - Number(isOut(a.quantity_on_hand)) ||
        urgency(a) - urgency(b) ||
        a.name.localeCompare(b.name, 'en'),
    );
  const rows = low.slice(0, dashboard.stockAlertRows);
  const loading = ingredientsState === 'loading' && ingredients.length === 0;
  const failed = ingredientsState === 'error' && ingredients.length === 0;

  return (
    <Card labelledBy="alerts-title" className="overflow-hidden">
      <CardHeader
        id="alerts-title"
        title={t.alerts.title}
        subtitle={t.alerts.subtitle}
        border
        icon={low.length > 0 ? <Icon name="warning-outline" className="size-icon text-status-low-stock-fg" /> : undefined}
        right={
          <Link
            href="/stock"
            className="inline-flex items-center gap-1 h-10 px-2 -mr-2 rounded-md text-sm font-semibold text-primary hover:bg-primary-soft whitespace-nowrap"
          >
            {t.alerts.open}
            <Icon name="arrow-forward-outline" className="size-icon-sm" />
          </Link>
        }
      />
      {failed ? (
        <Banner
          tone="error"
          className="m-5"
          title={t.alerts.error}
          body={t.alerts.errorBody}
          action={
            <Button variant="ghost" size="sm" onClick={retryIngredients}>
              {t.alerts.retry}
            </Button>
          }
        />
      ) : loading ? (
        <LoadingRegion>
          {[0, 1].map((n) => (
            <div key={n} className={cx('px-5 py-4 flex flex-col gap-2', n > 0 && 'border-t border-border')}>
              <Skeleton className="h-5 w-1/3 rounded-sm" />
              <Skeleton className="h-4 w-1/2 rounded-sm" />
            </div>
          ))}
        </LoadingRegion>
      ) : rows.length === 0 ? (
        <div className="px-4 md:px-5 py-6 flex items-center gap-3">
          <Icon name="checkmark-circle" className="size-icon-lg text-success" />
          <div>
            <p className="text-md font-semibold text-text">{t.alerts.allGood}</p>
            <p className="text-sm text-text-muted">{t.alerts.allGoodBody}</p>
          </div>
        </div>
      ) : (
        <>
          <ul className="divide-y divide-border">
            {rows.map((i) => {
              const out = isOut(i.quantity_on_hand);
              const threshold = formatQuantity(i.low_stock_threshold, i.unit);
              return (
                <li key={i.id} data-alert={i.name}>
                  <Link
                    href={`/stock?q=${encodeURIComponent(i.name)}`}
                    aria-label={out ? t.alerts.ariaOut(i.name) : t.alerts.aria(i.name, formatQuantity(i.quantity_on_hand, i.unit))}
                    className={cx('relative flex items-center gap-3 px-4 md:px-5 py-3', flashBg(!!changes[i.id]?.flash, 'hover:bg-background'))}
                  >
                    <span aria-hidden="true" className="absolute inset-y-0 left-0 w-flag-edge bg-status-low-stock-fg" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-md font-semibold text-text">{i.name}</span>
                      <span className="block text-sm text-text-muted">
                        {out ? t.alerts.none(threshold) : t.alerts.left(formatQuantity(i.quantity_on_hand, i.unit), threshold)}
                      </span>
                    </span>
                    <StatusChip quantity={i.quantity_on_hand} threshold={i.low_stock_threshold} />
                  </Link>
                </li>
              );
            })}
          </ul>
          {low.length > rows.length && (
            <div className="px-4 md:px-5 py-3 border-t border-border">
              <Link href="/stock?show=low" className="text-sm font-semibold text-primary">
                {t.alerts.seeAll(low.length)}
              </Link>
            </div>
          )}
        </>
      )}
    </Card>
  );
}
