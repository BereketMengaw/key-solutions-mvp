// The waiter's one Realtime channel, shared by Tables and My orders.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Vibration } from 'react-native';

import { timing } from '@/theme';
import { useAuth } from './auth';
import { READY } from './names';
import { useOrdersChannel, type OrderChange } from './realtime';
import { supabase } from './supabase';

const REFETCH_DEBOUNCE_MS = 300;

type LiveValue = {
  /** Bumps when screens should refetch (debounced change, or the channel (re)subscribed). */
  version: number;
  /** Not subscribed for offlineBannerDelayMs: screens show "Live updates paused". */
  paused: boolean;
  /** The waiter's own orders that are ready (tab badge). */
  readyCount: number;
  /** Orders that turned ready live, for the highlight ring. */
  justReady: ReadonlySet<number>;
  clearJustReady: (id: number) => void;
  /** Unsubscribe before signing out. */
  stop: () => void;
};

const LiveContext = createContext<LiveValue | null>(null);

export function LiveOrdersProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const userId = session?.user.id;
  const [version, setVersion] = useState(0);
  const [readyCount, setReadyCount] = useState(0);
  const [justReady, setJustReady] = useState<ReadonlySet<number>>(new Set());
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const bump = useCallback(() => setVersion((v) => v + 1), []);

  const onChange = useCallback(
    (change: OrderChange) => {
      if (
        change.eventType === 'UPDATE' &&
        change.new.status === READY &&
        change.old.status !== READY &&
        change.new.waiter_id === userId
      ) {
        Vibration.vibrate(timing.readyVibrateMs);
        setJustReady((prev) => new Set(prev).add(change.new.id));
      }
      if (debounce.current) clearTimeout(debounce.current);
      debounce.current = setTimeout(bump, REFETCH_DEBOUNCE_MS);
    },
    [bump, userId],
  );

  const { connection, stop } = useOrdersChannel({ onChange, onSubscribed: bump });

  useEffect(() => () => {
    if (debounce.current) clearTimeout(debounce.current);
  }, []);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('waiter_id', userId)
      .eq('status', READY)
      .then(({ count, error }) => {
        if (!cancelled && !error) setReadyCount(count ?? 0);
      });
    return () => {
      cancelled = true;
    };
  }, [userId, version]);

  const clearJustReady = useCallback((id: number) => {
    setJustReady((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ version, paused: connection === 'offline', readyCount, justReady, clearJustReady, stop }),
    [version, connection, readyCount, justReady, clearJustReady, stop],
  );
  return <LiveContext.Provider value={value}>{children}</LiveContext.Provider>;
}

export function useLive(): LiveValue {
  const ctx = useContext(LiveContext);
  if (!ctx) throw new Error('useLive must be used inside LiveOrdersProvider');
  return ctx;
}

/** Calls `load` whenever the live channel asks for a refetch (not on the first render). */
export function useLiveRefetch(load: () => void) {
  const { version } = useLive();
  const latest = useRef(load);
  useEffect(() => {
    latest.current = load;
  });
  useEffect(() => {
    if (version > 0) latest.current();
  }, [version]);
}
