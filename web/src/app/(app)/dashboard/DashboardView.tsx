'use client';

import type { ReactNode } from 'react';
import { Icon, type IconName } from '@/components/icons';
import { Banner, Button, EmptyState, LoadingRegion, Skeleton, cx } from '@/components/ui';
import { useDashboard, type DashboardLive, type Delta } from '@/lib/dashboard/useDashboard';
import { formatDateLong, formatEtbNumber, formatWait, minutesSince } from '@/lib/format';
import { s } from '@/lib/strings';
import { LivePill } from '../stock/parts';
import { CountUp, flashBg } from './bits';
import { ChartsSkeleton, PaymentMix, SalesByHour, TopItems } from './Charts';
import { FloorSkeleton, LiveFloor, StockAlerts, isLate } from './Floor';

const t = s.dashboard;
const plain = (n: number) => String(n);

export function DashboardView({ serverNow }: { serverNow: number }) {
  const live = useDashboard(serverNow);
  const { data, load, connection, connectionBanner } = live;

  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold">{t.title}</h1>
          <p className="mt-1 text-md text-text-muted">{t.today(formatDateLong(live.now))}</p>
        </div>
        <LivePill state={connection} />
      </div>

      {connectionBanner === 'lost' ? (
        <Banner
          tone="error"
          className="mt-4"
          title={t.states.lostTitle}
          body={t.states.lostBody}
          action={
            <Button variant="ghost" size="sm" onClick={live.reconnect}>
              {t.states.retryNow}
            </Button>
          }
        />
      ) : connectionBanner === 'back' ? (
        <Banner tone="success" className="mt-4" title={t.states.backOnline} />
      ) : live.refreshFailed && load === 'ready' ? (
        <Banner
          tone="error"
          className="mt-4"
          title={t.states.refreshFailed}
          body={t.states.refreshFailedBody}
          action={
            <Button variant="ghost" size="sm" onClick={live.retry}>
              {t.states.retry}
            </Button>
          }
        />
      ) : null}

      <p className="sr-only" aria-live="polite">
        {live.announcement}
      </p>

      {load === 'error' || load === 'forbidden' ? (
        <>
          <div className="mt-6 bg-surface border border-border rounded-xl py-16 px-6">
            {load === 'error' ? (
              <EmptyState
                error
                icon="cloud-offline-outline"
                title={t.states.loadFailed}
                body={t.states.loadFailedBody}
                action={
                  <Button variant="secondary" onClick={live.retry}>
                    {t.states.tryAgain}
                  </Button>
                }
              />
            ) : (
              <EmptyState icon="person-circle-outline" title={t.states.forbidden} body={t.states.forbiddenBody} />
            )}
          </div>
          <div className="mt-6 xl:max-w-side-panel">
            <StockAlerts />
          </div>
        </>
      ) : (
        <>
          {!data ? (
            <TilesSkeleton />
          ) : data.orders_today === 0 ? (
            <Hero />
          ) : (
            <Tiles live={live} />
          )}

          <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_var(--spacing-side-panel)] xl:items-start">
            <div className="flex flex-col gap-6 md:grid md:grid-cols-2 md:items-start xl:flex xl:flex-col xl:col-start-2 xl:row-start-1 min-w-0">
              {data ? (
                <LiveFloor
                  rows={data.live_floor}
                  leaving={live.leaving}
                  now={live.now}
                  flashes={live.flashes}
                  entered={live.entered}
                />
              ) : (
                <FloorSkeleton />
              )}
              <StockAlerts />
            </div>
            <div className="flex flex-col gap-6 xl:col-start-1 xl:row-start-1 min-w-0">
              {data ? (
                <>
                  <SalesByHour hours={data.sales_by_hour} paidOrders={data.paid_orders} now={live.now} flashes={live.flashes} />
                  <div className="grid gap-6 md:grid-cols-2">
                    <TopItems items={data.top_items} ordersToday={data.orders_today} flashes={live.flashes} />
                    <PaymentMix mix={data.payment_mix} paidOrders={data.paid_orders} flashes={live.flashes} />
                  </div>
                </>
              ) : (
                <ChartsSkeleton />
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- hero (fresh morning) */

function Hero() {
  return (
    <div
      data-hero
      className="mt-6 rounded-xl bg-surface border border-border shadow-sm p-6 flex flex-col text-center md:flex-row md:text-left items-center gap-5"
    >
      <div className="size-hero-circle flex-none rounded-full bg-primary-soft grid place-items-center">
        <Icon name="cafe-outline" className="size-icon-xl text-primary" />
      </div>
      <div>
        <h2 className="text-xl font-bold text-text">{t.hero.title}</h2>
        <p className="mt-1 text-md text-text-muted">{t.hero.body}</p>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- tiles */

function Tiles({ live }: { live: DashboardLive }) {
  const d = live.data!;
  const average = d.paid_orders > 0 ? Math.round(d.sales_etb / d.paid_orders) : null;
  const oldest = d.live_floor[0];
  const oldestWait = oldest ? formatWait(minutesSince(oldest.created_at, live.now)) : '';
  const oldestLate = oldest ? isLate(oldest, live.now) : false;
  const salesCaption = d.paid_orders === 0 ? t.tiles.salesNone : t.tiles.salesFrom(d.paid_orders);
  const ordersCaption = t.tiles.ordersCaption(d.paid_orders, d.open_orders);
  const avgCaption = average === null ? t.tiles.averageNone : t.tiles.averageCaption;
  const openCaption = !oldest
    ? t.tiles.openNone
    : oldestLate
      ? t.tiles.oldestLate(oldest.table_number, oldestWait)
      : t.tiles.oldest(oldest.table_number, oldestWait);
  const enter = (i: number) =>
    live.tilesEnter ? { className: 'dash-enter', style: { animationDelay: `${i * 50}ms` } } : undefined;

  return (
    <div className="mt-6 grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-4">
      <Tile
        id="sales"
        icon="cash-outline"
        label={t.tiles.sales}
        aria={t.tiles.aria(t.tiles.sales, `${formatEtbNumber(d.sales_etb)} ${t.tiles.unit}`, salesCaption)}
        flash={live.flashes.has('tile:sales')}
        enter={enter(0)}
        value={<Money value={d.sales_etb} animate={live.countUp} />}
        delta={<DeltaSlot delta={live.deltas.sales} text={t.tiles.deltaEtb(formatEtbNumber(live.deltas.sales.amount))} />}
        caption={salesCaption}
      />
      <Tile
        id="orders"
        icon="receipt-outline"
        label={t.tiles.orders}
        aria={t.tiles.aria(t.tiles.orders, String(d.orders_today), ordersCaption)}
        flash={live.flashes.has('tile:orders')}
        enter={enter(1)}
        value={
          <span className="text-2xl md:text-3xl font-bold text-text tabular-nums">
            <CountUp value={d.orders_today} animate={live.countUp} format={plain} />
          </span>
        }
        delta={<DeltaSlot delta={live.deltas.orders} text={t.tiles.deltaCount(live.deltas.orders.amount)} />}
        caption={ordersCaption}
      />
      <Tile
        id="average"
        icon="pricetag-outline"
        label={t.tiles.average}
        aria={t.tiles.aria(t.tiles.average, average === null ? t.tiles.dash : `${formatEtbNumber(average)} ${t.tiles.unit}`, avgCaption)}
        flash={live.flashes.has('tile:avg')}
        enter={enter(2)}
        value={
          average === null ? (
            <span className="text-2xl md:text-3xl font-bold text-text-subtle">{t.tiles.dash}</span>
          ) : (
            <Money value={average} animate={live.countUp} />
          )
        }
        caption={avgCaption}
      />
      <Tile
        id="open"
        icon="restaurant-outline"
        label={t.tiles.open}
        aria={t.tiles.aria(t.tiles.open, String(d.open_orders), openCaption)}
        flash={live.flashes.has('tile:open')}
        enter={enter(3)}
        value={
          <span className="text-2xl md:text-3xl font-bold text-text tabular-nums">
            <CountUp value={d.open_orders} animate={live.countUp} format={plain} />
          </span>
        }
        caption={
          oldestLate ? (
            <span className="inline-flex items-center gap-1 text-danger font-semibold">
              <Icon name="alert-circle" className="size-icon-sm" />
              {openCaption}
            </span>
          ) : (
            openCaption
          )
        }
      />
    </div>
  );
}

function Money({ value, animate }: { value: number; animate: boolean }) {
  return (
    <>
      <span className="text-2xl md:text-3xl font-bold text-text tabular-nums">
        <CountUp value={value} animate={animate} format={formatEtbNumber} />
      </span>
      <span className="text-md md:text-lg font-semibold text-text-muted">{t.tiles.unit}</span>
    </>
  );
}

function DeltaSlot({ delta, text }: { delta: Delta; text: string }) {
  return (
    <span
      className={cx(
        'block min-h-[1lh] text-sm font-semibold tabular-nums text-success',
        // Appears at once; only the fade-out is animated.
        delta.visible ? 'opacity-100' : 'opacity-0 transition-opacity duration-300 motion-reduce:transition-none',
      )}
    >
      {delta.amount > 0 ? text : ' '}
    </span>
  );
}

function Tile({
  id,
  icon,
  label,
  aria,
  value,
  delta,
  caption,
  flash,
  enter,
}: {
  id: string;
  icon: IconName;
  label: string;
  aria: string;
  value: ReactNode;
  delta?: ReactNode;
  caption: ReactNode;
  flash: boolean;
  enter?: { className: string; style: React.CSSProperties };
}) {
  return (
    <div
      role="group"
      aria-label={aria}
      data-tile={id}
      style={enter?.style}
      className={cx(
        'rounded-xl border border-border shadow-sm p-4 md:p-5 flex flex-col gap-1 min-w-0',
        flashBg(flash),
        enter?.className,
      )}
    >
      <div aria-hidden="true" className="contents">
        <span className="flex items-center gap-2 text-sm font-semibold text-text-muted">
          <Icon name={icon} className="size-icon" />
          {label}
        </span>
        <span data-value className="mt-1 flex items-baseline flex-wrap gap-x-1">
          {value}
        </span>
        {delta}
        <span className="text-sm text-text-muted line-clamp-2">{caption}</span>
      </div>
    </div>
  );
}

function TilesSkeleton() {
  return (
    <LoadingRegion className="mt-6 grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-4">
      {[0, 1, 2, 3].map((n) => (
        <div key={n} className="rounded-xl bg-surface border border-border shadow-sm p-4 md:p-5 flex flex-col gap-3">
          <Skeleton className="h-5 w-1/2 rounded-sm" />
          <Skeleton className="h-10 w-2/3 rounded-sm" />
          <Skeleton className="h-4 w-3/4 rounded-sm" />
        </div>
      ))}
    </LoadingRegion>
  );
}
