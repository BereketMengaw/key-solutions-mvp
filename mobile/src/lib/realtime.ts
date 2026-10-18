// One Realtime channel on `orders` with connection state, reconnect and cleanup.
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { useCallback, useEffect, useRef, useState } from 'react';

import type { Tables } from '@shared/database.types';
import { timing } from '@/theme';
import { supabase } from './supabase';

export type Connection = 'connecting' | 'live' | 'reconnecting' | 'offline';
export type OrderChange = RealtimePostgresChangesPayload<Tables<'orders'>>;

type Handlers = {
  /** Every INSERT / UPDATE / DELETE on orders the user may read (RLS applies). */
  onChange: (change: OrderChange) => void;
  /**
   * Called every time the channel reports SUBSCRIBED: the first time and after every
   * reconnect. Events are not replayed, so callers refetch here.
   */
  onSubscribed: () => void;
};

let channelSeq = 0;

export function useOrdersChannel(handlers: Handlers) {
  const [connection, setConnection] = useState<Connection>('connecting');
  const [attempt, setAttempt] = useState(0);
  const latest = useRef(handlers);
  const stopRef = useRef<(() => void) | null>(null);
  const stopped = useRef(false);

  useEffect(() => {
    latest.current = handlers;
  });

  useEffect(() => {
    if (stopped.current) return;
    let closedByUs = false;
    channelSeq += 1;
    const channel = supabase
      .channel(`orders-${channelSeq}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (change: OrderChange) =>
        latest.current.onChange(change),
      )
      .subscribe((status) => {
        if (closedByUs) return;
        if (status === 'SUBSCRIBED') {
          setConnection('live');
          latest.current.onSubscribed();
          return;
        }
        // CHANNEL_ERROR / TIMED_OUT: supabase-js retries on its own. CLOSED: it won't, so re-create.
        setConnection((c) => (c === 'offline' || c === 'connecting' ? c : 'reconnecting'));
        if (status === 'CLOSED') setAttempt((a) => a + 1);
      });

    const stop = () => {
      if (closedByUs) return;
      closedByUs = true;
      supabase.removeChannel(channel);
    };
    stopRef.current = stop;
    return stop;
  }, [attempt]);

  // Not live for offlineBannerDelayMs → offline. Brief drops only show "reconnecting".
  useEffect(() => {
    if (connection !== 'connecting' && connection !== 'reconnecting') return;
    const t = setTimeout(() => setConnection('offline'), timing.offlineBannerDelayMs);
    return () => clearTimeout(t);
  }, [connection]);

  /** Drop the channel and open a new one (the "Retry now" button). */
  const retry = useCallback(() => {
    stopRef.current?.();
    setAttempt((a) => a + 1);
  }, []);

  /** Unsubscribe for good (before sign out). */
  const stop = useCallback(() => {
    stopped.current = true;
    stopRef.current?.();
  }, []);

  return { connection, retry, stop };
}
