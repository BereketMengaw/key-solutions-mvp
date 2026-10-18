'use client';

// Live data for the owner dashboard: one dashboard_today() call, refetched (debounced,
// sequence-guarded) on Realtime events from orders, order_items and ingredients, on every
// SUBSCRIBED and on the later "Subscribed to PostgreSQL" system message, and when the Addis
// date rolls over. Each new response is compared with the one on screen so only what changed
// flashes, counts up or announces itself.

import { useCallback, useEffect, useRef, useState } from 'react';
import { timing } from '@design/tokens';
import type { PaymentMethod } from '@shared/constants';
import type { DashboardToday } from '@shared/dashboard';
import { addisDateKey, formatEtbNumber } from '@/lib/format';
import type { Connection } from '@/lib/stock/StockProvider';
import { s } from '@/lib/strings';
import { getSupabase } from '@/lib/supabase/client';

export type LiveRow = DashboardToday['live_floor'][number];
export type DashLoad = 'loading' | 'ready' | 'error' | 'forbidden';
export type Delta = { amount: number; visible: boolean };

export type DashboardLive = {
  data: DashboardToday | null;
  load: DashLoad;
  /** Data is on screen but the latest refetch failed. */
  refreshFailed: boolean;
  connection: Connection;
  connectionBanner: 'none' | 'lost' | 'back';
  /** False on first load and after a reconnect: values switch without counting. */
  countUp: boolean;
  /** Keys that just changed: "tile:sales", "order:12", "item:5", "hour:13", "pay:telebirr". */
  flashes: ReadonlySet<string>;
  /** Floor rows that just appeared in their group ("order:12"): they play the enter animation. */
  entered: ReadonlySet<string>;
  /** Rows that just left the floor (paid): shown fading out in their old group for a moment. */
  leaving: LiveRow[];
  deltas: { sales: Delta; orders: Delta };
  /** The fresh-day hero just gave way to the tiles. */
  tilesEnter: boolean;
  announcement: string;
  /** One clock for every wait time on the page (ticks every timing.timerTickMs). */
  now: number;
  retry: () => void;
  reconnect: () => void;
};

const DEBOUNCE_MS = 300;
const TIMEOUT_MS = 15_000;
const NO_DELTA: Delta = { amount: 0, visible: false };

function withTimeout<T>(p: PromiseLike<T>): Promise<T> {
  return Promise.race([
    Promise.resolve(p),
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('timeout')), TIMEOUT_MS)),
  ]);
}

/** JSON numbers may arrive as "1370.00"-style values from numeric columns: make them numbers. */
function normalize(raw: DashboardToday): DashboardToday {
  const n = Number;
  return {
    ...raw,
    sales_etb: n(raw.sales_etb),
    paid_orders: n(raw.paid_orders),
    orders_today: n(raw.orders_today),
    average_order_etb: n(raw.average_order_etb),
    open_orders: n(raw.open_orders),
    sales_by_hour: (raw.sales_by_hour ?? []).map((h) => ({ hour: n(h.hour), sales_etb: n(h.sales_etb) })),
    top_items: (raw.top_items ?? []).map((t) => ({
      ...t,
      quantity: n(t.quantity),
      revenue_etb: n(t.revenue_etb),
    })),
    payment_mix: (raw.payment_mix ?? []).map((p) => ({ ...p, sales_etb: n(p.sales_etb), orders: n(p.orders) })),
    live_floor: (raw.live_floor ?? []).map((r) => ({
      ...r,
      item_count: n(r.item_count),
      total_etb: n(r.total_etb),
    })),
    low_stock: (raw.low_stock ?? []).map((l) => ({
      ...l,
      quantity_on_hand: n(l.quantity_on_hand),
      low_stock_threshold: n(l.low_stock_threshold),
    })),
  };
}

const avg = (d: DashboardToday) => (d.paid_orders > 0 ? Math.round(d.sales_etb / d.paid_orders) : 0);

type Diff = {
  flashes: string[];
  entered: string[];
  leaving: LiveRow[];
  announcements: string[];
  tilesEnter: boolean;
};

function diff(old: DashboardToday, next: DashboardToday): Diff {
  const flashes: string[] = [];
  const entered: string[] = [];
  const announcements: string[] = [];

  if (old.sales_etb !== next.sales_etb) flashes.push('tile:sales');
  if (old.orders_today !== next.orders_today) flashes.push('tile:orders');
  if (avg(old) !== avg(next)) flashes.push('tile:avg');
  if (old.open_orders !== next.open_orders) flashes.push('tile:open');

  const oldRows = new Map(old.live_floor.map((r) => [r.id, r]));
  const nextIds = new Set(next.live_floor.map((r) => r.id));
  for (const r of next.live_floor) {
    const before = oldRows.get(r.id);
    if (!before) announcements.push(s.dashboard.announce.newOrder(r.table_number));
    if (!before || before.status !== r.status) {
      entered.push(`order:${r.id}`);
      flashes.push(`order:${r.id}`);
    }
  }
  const leaving = old.live_floor.filter((r) => !nextIds.has(r.id));
  if (leaving.length) {
    const gained = next.payment_mix.find((p) => {
      const before = old.payment_mix.find((o) => o.method === p.method);
      return p.orders > (before?.orders ?? 0);
    });
    if (gained) {
      for (const r of leaving) {
        announcements.push(
          s.dashboard.announce.paid(
            r.table_number,
            formatEtbNumber(r.total_etb),
            s.dashboard.mix.method[gained.method as PaymentMethod],
            formatEtbNumber(next.sales_etb),
          ),
        );
      }
    }
  }

  const oldItems = new Map(old.top_items.map((t) => [t.menu_item_id, t]));
  for (const t of next.top_items) {
    const before = oldItems.get(t.menu_item_id);
    if (!before || before.quantity !== t.quantity || before.revenue_etb !== t.revenue_etb) {
      flashes.push(`item:${t.menu_item_id}`);
    }
  }

  const oldHours = new Map(old.sales_by_hour.map((h) => [h.hour, h.sales_etb]));
  for (const h of next.sales_by_hour) {
    if ((oldHours.get(h.hour) ?? 0) !== h.sales_etb) flashes.push(`hour:${h.hour}`);
  }

  const oldMix = new Map(old.payment_mix.map((p) => [p.method, p.sales_etb]));
  for (const p of next.payment_mix) {
    if ((oldMix.get(p.method) ?? 0) !== p.sales_etb) flashes.push(`pay:${p.method}`);
  }

  return {
    flashes,
    entered,
    leaving,
    announcements,
    tilesEnter: old.orders_today === 0 && next.orders_today > 0,
  };
}

export function useDashboard(serverNow: number): DashboardLive {
  const supabase = getSupabase();

  const dataRef = useRef<DashboardToday | null>(null);
  const [data, setData] = useState<DashboardToday | null>(null);
  const [load, setLoad] = useState<DashLoad>('loading');
  const [refreshFailed, setRefreshFailed] = useState(false);
  const [countUp, setCountUp] = useState(false);
  const [flashes, setFlashes] = useState<ReadonlySet<string>>(new Set());
  const [entered, setEntered] = useState<ReadonlySet<string>>(new Set());
  const [leaving, setLeaving] = useState<LiveRow[]>([]);
  const [deltas, setDeltas] = useState<{ sales: Delta; orders: Delta }>({ sales: NO_DELTA, orders: NO_DELTA });
  const [tilesEnter, setTilesEnter] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const [now, setNow] = useState(serverNow);
  const [connection, setConnection] = useState<Connection>('connecting');
  const [connectionBanner, setConnectionBanner] = useState<'none' | 'lost' | 'back'>('none');

  /* ---------------------------------------------------------- timers */

  const timers = useRef(new Set<number>());
  const later = useCallback((fn: () => void, ms: number) => {
    const t = window.setTimeout(() => {
      timers.current.delete(t);
      fn();
    }, ms);
    timers.current.add(t);
    return t;
  }, []);
  const keyTimers = useRef(new Map<string, number>());
  const restart = useCallback(
    (key: string, fn: () => void, ms: number) => {
      window.clearTimeout(keyTimers.current.get(key));
      keyTimers.current.set(key, later(fn, ms));
    },
    [later],
  );

  /* ---------------------------------------------------------- apply a response */

  /** Set before the refetch that follows a reconnect: that response switches without count-up or delta. */
  const quietNext = useRef(false);

  const apply = useCallback(
    (next: DashboardToday) => {
      const old = dataRef.current;
      const quiet = quietNext.current;
      quietNext.current = false;
      dataRef.current = next;
      setData(next);
      setLoad('ready');
      setRefreshFailed(false);
      setNow(Date.now());
      if (!old) {
        setCountUp(false);
        return;
      }
      setCountUp(!quiet);
      const d = diff(old, next);

      const pulse = (setter: typeof setFlashes, keys: string[], prefix: string) => {
        if (!keys.length) return;
        setter((prev) => new Set([...prev, ...keys]));
        for (const k of keys) {
          restart(
            `${prefix}:${k}`,
            () =>
              setter((prev) => {
                const next = new Set(prev);
                next.delete(k);
                return next;
              }),
            timing.rowFlashHoldMs,
          );
        }
      };
      pulse(setFlashes, d.flashes, 'flash');
      pulse(setEntered, d.entered, 'enter');
      if (d.leaving.length) {
        const ids = new Set(d.leaving.map((r) => r.id));
        setLeaving((prev) => [...prev.filter((r) => !ids.has(r.id)), ...d.leaving]);
        later(() => setLeaving((prev) => prev.filter((r) => !ids.has(r.id))), timing.enterMs);
      }
      if (d.tilesEnter && !quiet) {
        setTilesEnter(true);
        later(() => setTilesEnter(false), timing.enterMs + 400);
      }
      if (d.announcements.length) setAnnouncement(d.announcements.join(' '));

      // Deltas: increases only, never after a reconnect; a second increase adds up.
      if (!quiet) {
        const bump = (key: 'sales' | 'orders', inc: number) => {
          if (inc <= 0) return;
          setDeltas((prev) => ({
            ...prev,
            [key]: { amount: (prev[key].visible ? prev[key].amount : 0) + inc, visible: true },
          }));
          restart(
            `delta:${key}`,
            () => setDeltas((prev) => ({ ...prev, [key]: { ...prev[key], visible: false } })),
            timing.deltaShowMs,
          );
        };
        bump('sales', next.sales_etb - old.sales_etb);
        bump('orders', next.orders_today - old.orders_today);
      }
    },
    [later, restart],
  );

  /* ---------------------------------------------------------- fetch */

  const fetchSeq = useRef(0);
  /** Resolves true when this fetch (or a newer one that replaced it) left fresh data on screen. */
  const fetchToday = useCallback(async (): Promise<boolean> => {
    const seq = ++fetchSeq.current;
    let result: { data: unknown; error: { code?: string } | null };
    try {
      result = await withTimeout(supabase.rpc('dashboard_today'));
    } catch {
      result = { data: null, error: { code: 'timeout' } };
    }
    if (seq !== fetchSeq.current) return true; // a newer fetch is in flight; it decides
    const { data: raw, error } = result;
    if (error || !raw) {
      if (error?.code === '42501') setLoad('forbidden');
      else if (dataRef.current) setRefreshFailed(true);
      else setLoad('error');
      return false;
    }
    apply(normalize(raw as DashboardToday));
    return true;
  }, [supabase, apply]);

  const debounce = useRef<number | undefined>(undefined);
  const scheduleFetch = useCallback(() => {
    window.clearTimeout(debounce.current);
    debounce.current = later(() => void fetchToday(), DEBOUNCE_MS);
  }, [fetchToday, later]);

  /* ---------------------------------------------------------- realtime */

  const offlineTimer = useRef<number | undefined>(undefined);
  const wasOffline = useRef(false);
  const [channelGen, setChannelGen] = useState(0);

  useEffect(() => {
    let disposed = false;
    const channel = supabase
      .channel(`dashboard-${channelGen}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, scheduleFetch)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items' }, scheduleFetch)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ingredients' }, scheduleFetch)
      // Database changes only stream once the server says "Subscribed to PostgreSQL", which can
      // land a moment after SUBSCRIBED. Refetch again then, so nothing in that gap is missed.
      .on('system', {}, (payload: { extension?: string; status?: string }) => {
        if (payload.extension === 'postgres_changes' && payload.status === 'ok') scheduleFetch();
      });

    const startOfflineTimer = () => {
      if (offlineTimer.current !== undefined) return;
      offlineTimer.current = window.setTimeout(() => {
        if (disposed) return;
        setConnection('offline');
        setConnectionBanner('lost');
        wasOffline.current = true;
      }, timing.offlineBannerDelayMs);
    };

    void supabase.realtime.setAuth().then(() => {
      if (disposed) return;
      channel.subscribe((status) => {
        if (disposed) return;
        if (status === 'SUBSCRIBED') {
          window.clearTimeout(offlineTimer.current);
          offlineTimer.current = undefined;
          setConnection('live');
          const recovering = wasOffline.current;
          if (recovering) quietNext.current = true;
          // Events aren't replayed: refetch after every (re)subscribe.
          void fetchToday().then((ok) => {
            if (disposed || !recovering) return;
            wasOffline.current = false;
            if (ok) {
              setConnectionBanner('back');
              later(() => setConnectionBanner((b) => (b === 'back' ? 'none' : b)), timing.backOnlineMs);
            } else {
              setConnectionBanner('none');
            }
          });
        } else {
          setConnection((c) => (c === 'offline' ? c : c === 'connecting' ? 'connecting' : 'reconnecting'));
          startOfflineTimer();
        }
      });
    });
    startOfflineTimer();

    return () => {
      disposed = true;
      window.clearTimeout(offlineTimer.current);
      offlineTimer.current = undefined;
      void supabase.removeChannel(channel);
    };
  }, [supabase, channelGen, fetchToday, scheduleFetch, later]);

  // First load, independent of the socket (the page shouldn't wait for Realtime).
  useEffect(() => {
    void Promise.resolve().then(fetchToday);
  }, [fetchToday]);

  // One clock for the whole page; also rolls the day over at Addis midnight.
  useEffect(() => {
    const id = window.setInterval(() => {
      const t = Date.now();
      setNow(t);
      const shown = dataRef.current?.date;
      if (shown && addisDateKey(t) !== shown) scheduleFetch();
    }, timing.timerTickMs);
    return () => window.clearInterval(id);
  }, [scheduleFetch]);

  useEffect(() => {
    const all = timers.current;
    return () => {
      for (const t of all) window.clearTimeout(t);
      all.clear();
    };
  }, []);

  const retry = useCallback(() => {
    if (!dataRef.current) setLoad('loading');
    void fetchToday();
  }, [fetchToday]);

  const reconnect = useCallback(() => {
    setConnection('reconnecting');
    setChannelGen((g) => g + 1);
  }, []);

  return {
    data,
    load,
    refreshFailed,
    connection,
    connectionBanner,
    countUp,
    flashes,
    entered,
    leaving,
    deltas,
    tilesEnter,
    announcement,
    now,
    retry,
    reconnect,
  };
}
