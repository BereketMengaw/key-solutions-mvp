'use client';

import { useMemo, useRef, useState } from 'react';
import { Icon } from '@/components/icons';
import { Banner, Button, EmptyState, LoadingRegion, Skeleton, cx } from '@/components/ui';
import { useLang, useStrings } from '@/components/LangProvider';
import { formatDelta, formatQuantity, formatTime, isLow } from '@/lib/format';
import { nameIn, type Lang } from '@/lib/i18n';
import { useStock, type Ingredient, type MovementEntry, type RowChange } from '@/lib/stock/StockProvider';
import type { Strings } from '@/lib/strings';
import { PageHeader } from '../PageHeader';
import { AddStockDrawer, type AddStockResult } from './AddStockDrawer';
import { LevelBar, LivePill, LowFilter, SearchField, StatTile, StatusChip, Toast, type ToastMsg } from './parts';

function lowCaption(names: string[], s: Strings): string {
  if (names.length === 0) return s.stock.tiles.lowNone;
  if (names.length === 1) return names[0];
  if (names.length === 2) return s.stock.tiles.two(names[0], names[1]);
  return s.stock.tiles.more(names[0], names[1], names.length - 2);
}

function entryTitle(e: MovementEntry, s: Strings, lang: Lang): string {
  return e.kind === 'order' ? s.stock.panel.order(e.orderId, e.table) : s.stock.panel.delivery(nameIn(lang, e.ingredient));
}

export function StockView({ initialQuery, initialLowOnly }: { initialQuery: string; initialLowOnly: boolean }) {
  const s = useStrings();
  const lang = useLang();
  const stock = useStock();
  const { ingredients, ingredientsState, changes, connection, connectionBanner } = stock;

  /* ------------------------------------------------ search + filter (kept in the URL) */
  const [query, setQuery] = useState(initialQuery);
  const [lowOnly, setLowOnly] = useState(initialLowOnly);
  // Rows that stopped being low while the Low filter is on stay until the filter/search changes.
  const [pinned, setPinned] = useState<ReadonlySet<number>>(new Set());

  const syncUrl = (q: string, low: boolean) => {
    const url = new URL(window.location.href);
    if (q) url.searchParams.set('q', q);
    else url.searchParams.delete('q');
    if (low) url.searchParams.set('show', 'low');
    else url.searchParams.delete('show');
    window.history.replaceState(window.history.state, '', url);
  };
  const changeQuery = (q: string) => {
    setQuery(q);
    setPinned(new Set());
    syncUrl(q, lowOnly);
  };
  const changeLowOnly = (low: boolean) => {
    setLowOnly(low);
    setPinned(new Set());
    syncUrl(query, low);
  };

  const lowNames = useMemo(
    () => ingredients.filter((i) => isLow(i.quantity_on_hand, i.low_stock_threshold)).map((i) => nameIn(lang, i)),
    [ingredients, lang],
  );

  // Search matches the English and the Amharic name, whichever language is showing.
  const needle = query.trim().toLocaleLowerCase('en');
  const visible = ingredients.filter(
    (i) =>
      (!needle || i.name.toLocaleLowerCase('en').includes(needle) || i.name_am.includes(needle)) &&
      (!lowOnly || isLow(i.quantity_on_hand, i.low_stock_threshold) || pinned.has(i.id)),
  );
  // Remember what the Low filter is showing, so a row that recovers doesn't vanish under the cursor.
  if (lowOnly) {
    const missing = visible.filter((i) => !pinned.has(i.id));
    if (missing.length) setPinned(new Set([...pinned, ...missing.map((i) => i.id)]));
  }

  /* ------------------------------------------------ Add stock drawer */
  const [drawer, setDrawer] = useState<{ open: boolean; id: number | null; key: number }>({
    open: false,
    id: null,
    key: 0,
  });
  const headerAdd = useRef<HTMLButtonElement>(null);
  const phoneAdd = useRef<HTMLButtonElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const [toast, setToast] = useState<ToastMsg | null>(null);

  const openDrawer = (id: number | null, opener: HTMLElement | null) => {
    returnFocus.current = opener;
    setDrawer((d) => ({ open: true, id, key: d.key + 1 }));
  };
  const closeDrawer = () => {
    // If the row that opened it is gone (filtered out), go back to the header button.
    if (returnFocus.current && !returnFocus.current.isConnected) {
      returnFocus.current = headerAdd.current?.offsetParent ? headerAdd.current : phoneAdd.current;
    }
    setDrawer((d) => ({ ...d, open: false }));
  };
  const onAdded = ({ ingredient, added, newQuantity }: AddStockResult) => {
    stock.applyQuantity(ingredient.id, newQuantity);
    closeDrawer();
    const crossed =
      isLow(ingredient.quantity_on_hand, ingredient.low_stock_threshold) &&
      !isLow(newQuantity, ingredient.low_stock_threshold);
    setToast({
      id: Date.now(),
      title: s.drawer.toastTitle(formatQuantity(added, ingredient.unit, lang), nameIn(lang, ingredient)),
      body: crossed
        ? s.drawer.toastBack(nameIn(lang, ingredient))
        : s.drawer.toastNow(nameIn(lang, ingredient), formatQuantity(newQuantity, ingredient.unit, lang)),
    });
  };

  const loading = ingredientsState === 'loading' && ingredients.length === 0;
  const failed = ingredientsState === 'error' && ingredients.length === 0;
  const ready = !loading && !failed;
  const newest = stock.movements[0];

  const subtitle = loading
    ? s.stock.loading
    : failed
      ? undefined
      : s.stock.subtitle(ingredients.length);

  const addStockButton = (
    <Button
      ref={headerAdd}
      icon="add"
      disabled={loading}
      onClick={(e) => openDrawer(null, e.currentTarget)}
      className="hidden md:inline-flex"
    >
      {s.stock.addStock}
    </Button>
  );

  return (
    <div className="pb-phone-action-bar md:pb-0">
      {/* Phone: title + pill on one row. md+: the shared page header with actions. */}
      <div className="md:hidden">
        <div className="flex justify-between items-start gap-3">
          <h1 className="text-2xl font-bold">{s.stock.title}</h1>
          <LivePill state={connection} />
        </div>
        {subtitle && <p className="mt-1 text-md text-text-muted">{subtitle}</p>}
      </div>
      <div className="hidden md:block">
        <PageHeader
          title={s.stock.title}
          subtitle={subtitle}
          actions={
            <div className="flex items-center gap-3">
              <LivePill state={connection} />
              {!failed && addStockButton}
            </div>
          }
        />
      </div>

      {connectionBanner === 'lost' && (
        <Banner
          tone="error"
          className="mt-6"
          title={s.stock.connection.lostTitle}
          body={s.stock.connection.lostBody}
          action={
            <Button variant="ghost" size="sm" onClick={stock.reconnect}>
              {s.stock.connection.retryNow}
            </Button>
          }
        />
      )}
      {connectionBanner === 'back' && <Banner tone="success" className="mt-6" title={s.stock.connection.backOnline} />}

      <p className="sr-only" aria-live="polite">
        {stock.announcement}
      </p>

      {failed ? (
        <div className="mt-8 bg-surface border border-border rounded-xl py-16 px-6">
          <EmptyState
            error
            icon="cloud-offline-outline"
            title={s.stock.loadFailed}
            body={s.common.checkConnection}
            action={
              <Button variant="secondary" onClick={stock.retryIngredients}>
                {s.common.tryAgain}
              </Button>
            }
          />
        </div>
      ) : (
        <>
          {/* Stat tiles */}
          {loading ? (
            <LoadingRegion className="mt-6 grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
              {[0, 1, 2].map((n) => (
                <div
                  key={n}
                  className={cx('rounded-xl bg-surface border border-border shadow-sm p-4 md:p-5 flex flex-col gap-3', n === 2 && 'col-span-2 md:col-span-1')}
                >
                  <Skeleton className="h-5 w-1/2 rounded-sm" />
                  <Skeleton className="h-10 w-1/4 rounded-sm" />
                  <Skeleton className="h-4 w-2/3 rounded-sm" />
                </div>
              ))}
            </LoadingRegion>
          ) : (
            <div className="mt-6 grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
              <StatTile
                icon="warning-outline"
                label={s.stock.tiles.low}
                value={lowNames.length}
                caption={lowCaption(lowNames, s)}
                alert={lowNames.length > 0}
                flash={stock.lowTileFlash}
                valueClass="text-2xl md:text-3xl"
                button={{
                  pressed: lowOnly,
                  onClick: () => changeLowOnly(!lowOnly),
                  ariaLabel: s.stock.tiles.lowAria(lowNames.length, lowOnly),
                }}
              />
              <StatTile
                icon="cube-outline"
                label={s.stock.tiles.ingredients}
                value={ingredients.length}
                caption={s.stock.tiles.ingredientsCaption}
                valueClass="text-2xl md:text-3xl"
              />
              <LastChangeTile entry={newest} />
            </div>
          )}

          <div className="mt-6 md:mt-8 xl:grid xl:grid-cols-[minmax(0,1fr)_var(--spacing-side-panel)] xl:gap-6 xl:items-start">
            {/* Ingredients */}
            <section aria-label={s.stock.table.caption}>
              {/* Phone toolbar sits outside the card */}
              <div className="md:hidden">
                {loading ? (
                  <Skeleton className="h-12 rounded-md" />
                ) : (
                  <>
                    <SearchField value={query} onChange={changeQuery} />
                    <LowFilter
                      lowOnly={lowOnly}
                      onChange={changeLowOnly}
                      total={ingredients.length}
                      lowCount={lowNames.length}
                      className="mt-3 w-full"
                    />
                  </>
                )}
              </div>

              <div className="mt-4 md:mt-0 bg-surface border border-border rounded-xl shadow-sm overflow-hidden">
                <div className="hidden md:flex flex-wrap items-center gap-3 p-4 border-b border-border">
                  {loading ? (
                    <Skeleton className="h-12 flex-1 rounded-md" />
                  ) : (
                    <>
                      <SearchField value={query} onChange={changeQuery} className="flex-1 min-w-0" />
                      <LowFilter lowOnly={lowOnly} onChange={changeLowOnly} total={ingredients.length} lowCount={lowNames.length} />
                    </>
                  )}
                </div>

                {loading ? (
                  <TableSkeleton />
                ) : ingredients.length === 0 ? (
                  <div className="py-16 px-6">
                    <EmptyState icon="cube-outline" title={s.stock.empty} body={s.stock.emptyBody} />
                  </div>
                ) : visible.length === 0 ? (
                  needle ? (
                    <div className="py-12 px-6 text-center">
                      <p className="text-md font-semibold">{s.stock.noMatch(query.trim())}</p>
                      <Button variant="ghost" size="sm" className="mt-2" onClick={() => changeQuery('')}>
                        {s.stock.clearSearch}
                      </Button>
                    </div>
                  ) : (
                    <div className="py-12 px-6 flex flex-col items-center text-center">
                      <Icon name="checkmark-circle" className="size-icon-xl text-success" />
                      <p className="mt-3 text-md font-semibold">{s.stock.nothingLow}</p>
                      <p className="mt-1 text-sm text-text-muted">{s.stock.nothingLowBody}</p>
                      <Button variant="ghost" size="sm" className="mt-4" onClick={() => changeLowOnly(false)}>
                        {s.stock.showAll}
                      </Button>
                    </div>
                  )
                ) : (
                  <>
                    <IngredientTable rows={visible} changes={changes} onAdd={openDrawer} />
                    <IngredientList rows={visible} changes={changes} onAdd={openDrawer} />
                  </>
                )}

                {ready && visible.length > 0 && visible.length !== ingredients.length && (
                  <p className="px-4 py-3 border-t border-border text-sm text-text-muted tabular-nums">
                    {s.stock.showing(visible.length, ingredients.length)}
                  </p>
                )}
              </div>
            </section>

            <MovementsPanel />
          </div>
        </>
      )}

      {/* Phone: sticky Add stock bar */}
      {!failed && (
        <div className="md:hidden fixed inset-x-0 bottom-0 z-30 bg-surface border-t border-border px-4 pt-3 pb-[calc(var(--spacing-3)+env(safe-area-inset-bottom))]">
          <Button ref={phoneAdd} size="lg" fullWidth icon="add" disabled={loading} onClick={(e) => openDrawer(null, e.currentTarget)}>
            {s.stock.addStock}
          </Button>
        </div>
      )}

      <AddStockDrawer
        key={drawer.key}
        open={drawer.open}
        onClose={closeDrawer}
        ingredients={ingredients}
        initialId={drawer.id}
        onAdded={onAdded}
        returnFocusRef={returnFocus}
      />
      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}

/* ---------------------------------------------------------------- tiles */

function LastChangeTile({ entry }: { entry: MovementEntry | undefined }) {
  const s = useStrings();
  const lang = useLang();
  const value = entry ? formatTime(entry.at, lang) : s.stock.tiles.dash;
  const caption = entry ? entryTitle(entry, s, lang) : s.stock.tiles.lastNone;
  const long = value.length > 5;
  return (
    <>
      <StatTile
        icon="time-outline"
        label={s.stock.tiles.lastChange}
        value={value}
        caption={caption}
        valueClass={long ? 'text-2xl' : 'text-3xl'}
        className="hidden md:flex"
      />
      <StatTile icon="time-outline" label={s.stock.tiles.lastChange} value={value} caption={caption} inline className="md:hidden col-span-2" />
    </>
  );
}

/* ---------------------------------------------------------------- rows */

type RowProps = {
  rows: Ingredient[];
  changes: Record<number, RowChange>;
  onAdd: (id: number, opener: HTMLElement) => void;
};

function DeltaSlot({ change, unit }: { change: RowChange | undefined; unit: string }) {
  const lang = useLang();
  const up = (change?.delta ?? 0) > 0;
  return (
    <span
      className={cx(
        'text-sm tabular-nums whitespace-nowrap',
        // Appears at once; only the fade-out is animated.
        change?.deltaVisible ? 'opacity-100' : 'opacity-0 transition-opacity duration-300 motion-reduce:transition-none',
        up ? 'text-success font-semibold' : 'text-text-muted',
      )}
    >
      {change ? formatDelta(change.delta, unit, lang) : ' '}
    </span>
  );
}

const flashClass = (change: RowChange | undefined) =>
  change?.flash
    ? 'bg-primary-soft'
    : 'transition-colors duration-1500 motion-reduce:transition-none hover:bg-background';

function FlagEdge() {
  return <span aria-hidden="true" className="absolute inset-y-0 left-0 w-flag-edge bg-status-low-stock-fg" />;
}

function IngredientTable({ rows, changes, onAdd }: RowProps) {
  const s = useStrings();
  const lang = useLang();
  const th = 'px-4 py-3 text-left text-sm font-semibold text-text-muted bg-surface border-b border-border';
  return (
    <table className="hidden md:table w-full">
      <caption className="sr-only">{s.stock.table.caption}</caption>
      <thead>
        <tr>
          <th scope="col" className={cx(th, 'w-[30%]')}>
            {s.stock.table.ingredient}
          </th>
          <th scope="col" className={cx(th, 'text-right min-w-stock-qty-col whitespace-nowrap')}>
            {s.stock.table.onHand}
          </th>
          <th scope="col" className={cx(th, 'w-[40%]')}>
            {s.stock.table.level}
          </th>
          <th scope="col" className={cx(th, 'w-px min-w-stock-status-col whitespace-nowrap')}>
            {s.stock.table.status}
          </th>
          <th scope="col" className={cx(th, 'w-px')}>
            <span className="sr-only">{s.stock.table.actions}</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((i, n) => {
          const low = isLow(i.quantity_on_hand, i.low_stock_threshold);
          const change = changes[i.id];
          return (
            <tr key={i.id} data-ingredient={i.name} className={cx(n > 0 && 'border-t border-border', flashClass(change))}>
              <td className="relative px-4 py-3 align-middle">
                {low && <FlagEdge />}
                <p className="text-md font-semibold text-text">{nameIn(lang, i)}</p>
                <p className="text-sm text-text-subtle">{s.stock.table.lowBelow(formatQuantity(i.low_stock_threshold, i.unit, lang))}</p>
              </td>
              <td className="px-4 py-3 align-middle text-right whitespace-nowrap min-w-stock-qty-col">
                <p className={cx('text-lg font-semibold tabular-nums', low ? 'text-danger' : 'text-text')} data-qty>
                  {formatQuantity(i.quantity_on_hand, i.unit, lang)}
                </p>
                <DeltaSlot change={change} unit={i.unit} />
              </td>
              <td className="px-4 py-3 align-middle">
                <LevelBar quantity={i.quantity_on_hand} threshold={i.low_stock_threshold} />
              </td>
              <td className="px-4 py-3 align-middle whitespace-nowrap min-w-stock-status-col">
                <StatusChip quantity={i.quantity_on_hand} threshold={i.low_stock_threshold} />
              </td>
              <td className="px-4 py-3 align-middle whitespace-nowrap text-right">
                <Button
                  variant="secondary"
                  size="sm"
                  icon="add"
                  aria-label={s.stock.addTo(nameIn(lang, i))}
                  onClick={(e) => onAdd(i.id, e.currentTarget)}
                >
                  {s.stock.add}
                </Button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function IngredientList({ rows, changes, onAdd }: RowProps) {
  const s = useStrings();
  const lang = useLang();
  return (
    <ul className="md:hidden divide-y divide-border">
      {rows.map((i) => {
        const low = isLow(i.quantity_on_hand, i.low_stock_threshold);
        const change = changes[i.id];
        return (
          <li key={i.id} data-ingredient={i.name} className={cx('relative px-4 py-4', flashClass(change))}>
            {low && <FlagEdge />}
            <div className="flex items-start justify-between gap-3">
              <p className="text-md font-semibold">{nameIn(lang, i)}</p>
              <StatusChip quantity={i.quantity_on_hand} threshold={i.low_stock_threshold} />
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className={cx('text-xl font-bold tabular-nums', low ? 'text-danger' : 'text-text')}>
                {formatQuantity(i.quantity_on_hand, i.unit, lang)}
              </span>
              <DeltaSlot change={change} unit={i.unit} />
            </div>
            <div className="mt-3">
              <LevelBar quantity={i.quantity_on_hand} threshold={i.low_stock_threshold} />
            </div>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-sm text-text-subtle">{s.stock.table.lowBelow(formatQuantity(i.low_stock_threshold, i.unit, lang))}</span>
              <Button
                variant="secondary"
                size="sm"
                icon="add"
                aria-label={s.stock.addTo(nameIn(lang, i))}
                onClick={(e) => onAdd(i.id, e.currentTarget)}
              >
                {s.stock.add}
              </Button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function TableSkeleton() {
  return (
    <LoadingRegion>
      {Array.from({ length: 8 }, (_, n) => (
        <div key={n} className={cx('px-4 py-3 flex items-center gap-4', n > 0 && 'border-t border-border')}>
          <div className="w-1/3 flex flex-col gap-2">
            <Skeleton className="h-5 w-3/4 rounded-sm" />
            <Skeleton className="h-4 w-1/2 rounded-sm" />
          </div>
          <Skeleton className="h-level-bar w-1/3 rounded-full" />
        </div>
      ))}
    </LoadingRegion>
  );
}

/* ---------------------------------------------------------------- Orders and deliveries */

function MovementsPanel() {
  const s = useStrings();
  const lang = useLang();
  const { movements, movementsState, freshEntries, retryMovements } = useStock();
  return (
    <section
      aria-labelledby="movements-title"
      className="mt-6 xl:mt-0 xl:sticky xl:top-8 xl:max-h-[calc(100vh-var(--spacing-16))] flex flex-col bg-surface border border-border rounded-xl shadow-sm overflow-hidden"
    >
      <div className="px-5 pt-5 pb-4 border-b border-border">
        <h2 id="movements-title" className="text-lg font-bold">
          {s.stock.panel.title}
        </h2>
        <p className="text-sm text-text-muted">{s.stock.panel.subtitle}</p>
      </div>
      {movementsState === 'error' && movements.length === 0 ? (
        <Banner
          tone="error"
          className="m-5"
          title={s.stock.panel.errorTitle}
          body={s.stock.panel.errorBody}
          action={
            <Button variant="ghost" size="sm" onClick={retryMovements}>
              {s.stock.panel.retry}
            </Button>
          }
        />
      ) : movementsState === 'loading' && movements.length === 0 ? (
        <LoadingRegion>
          {[0, 1, 2].map((n) => (
            <div key={n} className={cx('px-5 py-4 flex gap-3', n > 0 && 'border-t border-border')}>
              <Skeleton className="size-10 rounded-full flex-none" />
              <div className="flex-1 flex flex-col gap-2">
                <Skeleton className="h-4 rounded-sm" />
                <Skeleton className="h-4 w-2/3 rounded-sm" />
              </div>
            </div>
          ))}
        </LoadingRegion>
      ) : movements.length === 0 ? (
        <div className="px-5 py-10 flex flex-col items-center text-center">
          <Icon name="receipt-outline" className="size-icon-xl text-text-subtle" />
          <p className="mt-3 text-md font-semibold">{s.stock.panel.empty}</p>
          <p className="mt-1 text-sm text-text-muted max-w-text-block">{s.stock.panel.emptyBody}</p>
        </div>
      ) : (
        <ol className="overflow-y-auto divide-y divide-border">
          {movements.map((e) => (
            <li
              key={e.key}
              data-entry={e.key}
              className={cx(
                'px-5 py-4 flex gap-3',
                freshEntries.has(e.key) ? 'bg-primary-soft' : 'transition-colors duration-1500 motion-reduce:transition-none',
              )}
            >
              <span
                className={cx(
                  'size-10 rounded-full flex-none grid place-items-center',
                  e.kind === 'order' ? 'bg-surface-muted' : 'bg-success-soft',
                )}
              >
                <Icon
                  name={e.kind === 'order' ? 'receipt-outline' : 'add-circle-outline'}
                  className={cx('size-icon', e.kind === 'order' ? 'text-text-muted' : 'text-success')}
                />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <p className="text-sm font-semibold text-text">{entryTitle(e, s, lang)}</p>
                  <time dateTime={e.at} className="ml-auto text-xs text-text-subtle tabular-nums whitespace-nowrap">
                    {formatTime(e.at, lang)}
                  </time>
                </div>
                {e.kind === 'order' ? (
                  <p className="mt-1 text-sm text-text-muted">
                    {e.lines.map((l, n) => (
                      <span key={l.name}>
                        {n > 0 && ' · '}
                        <span className="whitespace-nowrap">
                          {nameIn(lang, l)} {formatDelta(l.change, l.unit, lang)}
                        </span>
                      </span>
                    ))}
                  </p>
                ) : (
                  <>
                    <p className="mt-1 text-sm">
                      <span className="font-semibold text-success">{formatDelta(e.change, e.unit, lang)}</span>
                      {e.by && <span className="text-text-muted"> · {s.stock.panel.by(e.by)}</span>}
                    </p>
                    {e.note && <p className="mt-1 text-sm text-text line-clamp-2">“{e.note}”</p>}
                  </>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
