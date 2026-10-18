'use client';

// One live source of stock for the whole (app) frame: the Stock page and the nav's low-stock
// count read from here. Initial fetch + one Realtime channel ("stock") on ingredients and
// stock_movements; refetch on every SUBSCRIBED (first time and after each reconnect), with
// sequence guards so an older fetch never overwrites newer data.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { timing } from '@design/tokens';
import type { StockReason } from '@shared/constants';
import type { Tables } from '@shared/database.types';
import { formatQuantity, isLow } from '@/lib/format';
import { s } from '@/lib/strings';
import { getSupabase } from '@/lib/supabase/client';

export type Ingredient = Pick<
  Tables<'ingredients'>,
  'id' | 'name' | 'unit' | 'quantity_on_hand' | 'low_stock_threshold'
>;

/** A live change on a row: the summed delta (shown 6 s) and the row flash. */
export type RowChange = { delta: number; deltaVisible: boolean; flash: boolean };

export type MovementLine = { name: string; unit: string; change: number };
export type MovementEntry =
  | { key: string; kind: 'order'; at: string; orderId: number; table: number | null; lines: MovementLine[] }
  | {
      key: string;
      kind: 'restock';
      at: string;
      ingredient: string;
      unit: string;
      change: number;
      by: string;
      note: string;
    };

export type Connection = 'connecting' | 'live' | 'reconnecting' | 'offline';
export type LoadState = 'loading' | 'ready' | 'error';

type StockContextValue = {
  ingredients: Ingredient[];
  ingredientsState: LoadState;
  lowCount: number;
  changes: Record<number, RowChange>;
  /** True for timing.rowFlashHoldMs after an ingredient crosses into low. */
  lowTileFlash: boolean;
  movements: MovementEntry[];
  movementsState: LoadState;
  freshEntries: ReadonlySet<string>;
  connection: Connection;
  /** 'lost' after offlineBannerDelayMs without a connection; 'back' briefly after recovery. */
  connectionBanner: 'none' | 'lost' | 'back';
  announcement: string;
  retryIngredients: () => void;
  retryMovements: () => void;
  reconnect: () => void;
  /** add_stock returned the new quantity: show it at once (the realtime echo is then ignored). */
  applyQuantity: (id: number, quantity: number) => void;
};

const StockContext = createContext<StockContextValue | null>(null);

export function useStock(): StockContextValue {
  const ctx = useContext(StockContext);
  if (!ctx) throw new Error('useStock must be used inside <StockProvider>');
  return ctx;
}

const LISTED_REASONS: StockReason[] = ['order', 'restock'];
const MOVEMENT_ROWS = 60;
const MAX_ENTRIES = 12;
const MOVEMENT_DEBOUNCE_MS = 300;

const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name, 'en');

type MovementRow = {
  id: number;
  change: number;
  created_at: string;
  note: string;
  order_id: number | null;
  reason: StockReason;
  ingredients: { name: string; unit: string } | null;
  profiles: { full_name: string } | null;
  orders: { dining_tables: { number: number } | null } | null;
};

/** Order movements with the same order_id become one entry; each restock is its own. */
function groupMovements(rows: MovementRow[]): MovementEntry[] {
  const entries: MovementEntry[] = [];
  const orders = new Map<number, Extract<MovementEntry, { kind: 'order' }>>();
  for (const r of rows) {
    const name = r.ingredients?.name ?? '';
    const unit = r.ingredients?.unit ?? '';
    if (r.reason === 'order' && r.order_id != null) {
      let entry = orders.get(r.order_id);
      if (!entry) {
        entry = {
          key: `o${r.order_id}`,
          kind: 'order',
          at: r.created_at,
          orderId: r.order_id,
          table: r.orders?.dining_tables?.number ?? null,
          lines: [],
        };
        orders.set(r.order_id, entry);
        entries.push(entry);
      }
      entry.lines.push({ name, unit, change: Number(r.change) });
    } else if (r.reason === 'restock') {
      entries.push({
        key: `r${r.id}`,
        kind: 'restock',
        at: r.created_at,
        ingredient: name,
        unit,
        change: Number(r.change),
        by: r.profiles?.full_name ?? '',
        note: r.note ?? '',
      });
    }
  }
  for (const e of orders.values()) e.lines.sort(byName);
  return entries.slice(0, MAX_ENTRIES);
}

export function StockProvider({ children }: { children: ReactNode }) {
  const supabase = getSupabase();

  // Ingredients: the ref is the source of truth (realtime handlers read it synchronously).
  const ingRef = useRef(new Map<number, Ingredient>());
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [ingredientsState, setIngredientsState] = useState<LoadState>('loading');
  const [changes, setChanges] = useState<Record<number, RowChange>>({});
  const [lowTileFlash, setLowTileFlash] = useState(false);
  const [announcement, setAnnouncement] = useState('');

  const [movements, setMovements] = useState<MovementEntry[]>([]);
  const [movementsState, setMovementsState] = useState<LoadState>('loading');
  const [freshEntries, setFreshEntries] = useState<ReadonlySet<string>>(new Set());

  const [connection, setConnection] = useState<Connection>('connecting');
  const [connectionBanner, setConnectionBanner] = useState<'none' | 'lost' | 'back'>('none');

  const timers = useRef(new Set<number>());
  const later = useCallback((fn: () => void, ms: number) => {
    const t = window.setTimeout(() => {
      timers.current.delete(t);
      fn();
    }, ms);
    timers.current.add(t);
    return t;
  }, []);

  const commitIngredients = useCallback(() => {
    setIngredients([...ingRef.current.values()].sort(byName));
  }, []);

  /* ---------------------------------------------------------- live row changes */

  const deltaTimers = useRef(new Map<number, number>());
  const flashTimers = useRef(new Map<number, number>());

  const animateChange = useCallback(
    (id: number, delta: number) => {
      setChanges((prev) => {
        const old = prev[id];
        const sum = old?.deltaVisible ? old.delta + delta : delta;
        return { ...prev, [id]: { delta: sum, deltaVisible: true, flash: true } };
      });
      window.clearTimeout(deltaTimers.current.get(id));
      deltaTimers.current.set(
        id,
        later(() => {
          setChanges((prev) => (prev[id] ? { ...prev, [id]: { ...prev[id], deltaVisible: false } } : prev));
        }, timing.deltaShowMs),
      );
      window.clearTimeout(flashTimers.current.get(id));
      flashTimers.current.set(
        id,
        later(() => {
          setChanges((prev) => (prev[id] ? { ...prev, [id]: { ...prev[id], flash: false } } : prev));
        }, timing.rowFlashHoldMs),
      );
    },
    [later],
  );

  /** Counts realtime/RPC patches, so a fetch that started earlier can't undo them. */
  const patchSeq = useRef(0);
  const patchedAt = useRef(new Map<number, number>());

  const applyQuantity = useCallback(
    (id: number, quantity: number) => {
      const row = ingRef.current.get(id);
      if (!row) return;
      const q = Number(quantity);
      patchedAt.current.set(id, ++patchSeq.current);
      if (q === row.quantity_on_hand) return; // e.g. the echo of our own Add stock
      const wasLow = isLow(row.quantity_on_hand, row.low_stock_threshold);
      const nowLow = isLow(q, row.low_stock_threshold);
      ingRef.current.set(id, { ...row, quantity_on_hand: q });
      commitIngredients();
      animateChange(id, q - row.quantity_on_hand);
      if (wasLow !== nowLow) {
        const qty = formatQuantity(q, row.unit);
        setAnnouncement(nowLow ? s.stock.announce.low(row.name, qty) : s.stock.announce.back(row.name, qty));
        if (nowLow) {
          setLowTileFlash(true);
          later(() => setLowTileFlash(false), timing.rowFlashHoldMs);
        }
      }
    },
    [animateChange, commitIngredients, later],
  );

  /* ---------------------------------------------------------- fetches */

  const ingFetchSeq = useRef(0);
  const fetchIngredients = useCallback(
    async () => {
      const seq = ++ingFetchSeq.current;
      const startedAtPatch = patchSeq.current;
      const { data, error } = await supabase
        .from('ingredients')
        .select('id, name, unit, quantity_on_hand, low_stock_threshold');
      if (seq !== ingFetchSeq.current) return false; // a newer fetch is in flight
      if (error || !data) {
        // Keep showing the last known numbers if we have them.
        if (ingRef.current.size === 0) setIngredientsState('error');
        return false;
      }
      const next = new Map<number, Ingredient>();
      for (const r of data) {
        const fresh: Ingredient = {
          ...r,
          quantity_on_hand: Number(r.quantity_on_hand),
          low_stock_threshold: Number(r.low_stock_threshold),
        };
        const current = ingRef.current.get(r.id);
        // A live patch that landed after this fetch started is newer than the fetch.
        const keepLive = current && (patchedAt.current.get(r.id) ?? 0) > startedAtPatch;
        next.set(r.id, keepLive ? { ...fresh, quantity_on_hand: current.quantity_on_hand } : fresh);
      }
      ingRef.current = next;
      commitIngredients();
      setIngredientsState('ready');
      return true;
    },
    [supabase, commitIngredients],
  );

  const knownEntries = useRef<Set<string> | null>(null);
  const movFetchSeq = useRef(0);
  const fetchMovements = useCallback(
    async () => {
      const seq = ++movFetchSeq.current;
      const { data, error } = await supabase
        .from('stock_movements')
        .select(
          'id, change, created_at, note, order_id, reason, ingredients(name, unit), profiles(full_name), orders(dining_tables(number))',
        )
        .in('reason', LISTED_REASONS)
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .limit(MOVEMENT_ROWS);
      if (seq !== movFetchSeq.current) return false;
      if (error || !data) {
        setMovementsState('error');
        return false;
      }
      const entries = groupMovements(data as MovementRow[]);
      // Entries that weren't there before get the arrival flash (not on the first load).
      if (knownEntries.current) {
        const known = knownEntries.current;
        const fresh = entries.filter((e) => !known.has(e.key)).map((e) => e.key);
        if (fresh.length) {
          setFreshEntries((prev) => new Set([...prev, ...fresh]));
          later(
            () => setFreshEntries((prev) => new Set([...prev].filter((k) => !fresh.includes(k)))),
            timing.rowFlashHoldMs,
          );
        }
      }
      knownEntries.current = new Set(entries.map((e) => e.key));
      setMovements(entries);
      setMovementsState('ready');
      return true;
    },
    [supabase, later],
  );

  const movDebounce = useRef<number | undefined>(undefined);
  const scheduleMovements = useCallback(() => {
    window.clearTimeout(movDebounce.current);
    movDebounce.current = later(() => void fetchMovements(), MOVEMENT_DEBOUNCE_MS);
  }, [fetchMovements, later]);

  /* ---------------------------------------------------------- realtime */

  const offlineTimer = useRef<number | undefined>(undefined);
  const wasOffline = useRef(false);
  const [channelGen, setChannelGen] = useState(0);

  useEffect(() => {
    let disposed = false;
    const channel = supabase
      .channel(`stock-${channelGen}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'ingredients' }, (payload) => {
        const row = payload.new as Ingredient;
        applyQuantity(row.id, Number(row.quantity_on_hand));
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'ingredients' }, () => {
        void fetchIngredients();
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'stock_movements' }, () => {
        scheduleMovements();
      })
      // Database changes only stream once the server says "Subscribed to PostgreSQL", which can
      // land a moment after SUBSCRIBED. Refetch again then, so nothing in that gap is missed.
      .on('system', {}, (payload: { extension?: string; status?: string }) => {
        if (payload.extension === 'postgres_changes' && payload.status === 'ok') {
          void fetchIngredients();
          scheduleMovements();
        }
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
          // Events aren't replayed: refetch everything after every (re)subscribe.
          void Promise.all([fetchIngredients(), fetchMovements()]).then(([okIng]) => {
            if (disposed || !wasOffline.current) return;
            wasOffline.current = false;
            if (okIng) {
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
  }, [supabase, channelGen, applyQuantity, fetchIngredients, fetchMovements, scheduleMovements, later]);

  // First load, independent of the socket (the page shouldn't wait for Realtime).
  useEffect(() => {
    // Started from a callback: both fetches only set state after their network round trip.
    void Promise.resolve().then(() => Promise.all([fetchIngredients(), fetchMovements()]));
  }, [fetchIngredients, fetchMovements]);

  useEffect(() => {
    const all = timers.current;
    return () => {
      for (const t of all) window.clearTimeout(t);
      all.clear();
    };
  }, []);

  const reconnect = useCallback(() => {
    setConnection('reconnecting');
    setChannelGen((g) => g + 1);
  }, []);
  const retryIngredients = useCallback(() => {
    setIngredientsState('loading');
    void fetchIngredients();
  }, [fetchIngredients]);
  const retryMovements = useCallback(() => {
    setMovementsState('loading');
    void fetchMovements();
  }, [fetchMovements]);

  const lowCount = useMemo(
    () => ingredients.filter((i) => isLow(i.quantity_on_hand, i.low_stock_threshold)).length,
    [ingredients],
  );

  const value = useMemo<StockContextValue>(
    () => ({
      ingredients,
      ingredientsState,
      lowCount,
      changes,
      lowTileFlash,
      movements,
      movementsState,
      freshEntries,
      connection,
      connectionBanner,
      announcement,
      retryIngredients,
      retryMovements,
      reconnect,
      applyQuantity,
    }),
    [
      ingredients,
      ingredientsState,
      lowCount,
      changes,
      lowTileFlash,
      movements,
      movementsState,
      freshEntries,
      connection,
      connectionBanner,
      announcement,
      retryIngredients,
      retryMovements,
      reconnect,
      applyQuantity,
    ],
  );

  return <StockContext.Provider value={value}>{children}</StockContext.Provider>;
}
