// Kitchen board (role cook): live lanes New / Preparing / Ready, one tap moves a ticket on.
import { useKeepAwake } from 'expo-keep-awake';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  BackHandler,
  FlatList,
  LayoutAnimation,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Ionicons } from '@expo/vector-icons';
import type { OrderStatus } from '@shared/constants';
import { nextOrderStatus } from '@shared/constants';
import { Text } from '@/components/Text';
import { Button } from '@/components/Button';
import { Banner, Bone, EmptyState, Skeleton } from '@/components/Feedback';
import {
  ConnectionPill,
  KitchenLane,
  KitchenTicket,
  LaneEmpty,
  LaneHeader,
  ReadyChip,
  ReadyTicket,
  type LaneStatus,
  type TicketData,
} from '@/components/Kitchen';
import { useAuth } from '@/lib/auth';
import { confirmDestructive } from '@/lib/confirm';
import { formatTime } from '@/lib/format';
import { KITCHEN_STATUSES, PREPARING, READY, SENT } from '@/lib/names';
import { advanceOrder } from '@/lib/orders';
import { useOrientationLock } from '@/lib/orientation';
import { useOrdersChannel, type OrderChange } from '@/lib/realtime';
import { supabase } from '@/lib/supabase';
import { LanguageSwitch } from '@/components/LanguageSwitch';
import { useT } from '@/lib/i18n';
import { breakpoints, colors, radius, spacing, statusColors, tabularNums, text, timing, touch } from '@/theme';

const SELECT =
  'id, status, created_at, dining_tables(number), profiles(full_name), order_items(id, quantity, note, menu_items(name, name_am))';

type Ticket = TicketData & { leaving: boolean };
type Board = Map<number, Ticket>;

function isLaneStatus(status: OrderStatus): status is LaneStatus {
  return (KITCHEN_STATUSES as readonly OrderStatus[]).includes(status);
}

type Row = {
  id: number;
  status: OrderStatus;
  created_at: string;
  dining_tables: { number: number };
  profiles: { full_name: string };
  order_items: { id: number; quantity: number; note: string; menu_items: { name: string; name_am: string } }[];
};

function toTicket(o: Row): Ticket | null {
  if (!isLaneStatus(o.status)) return null;
  return {
    id: o.id,
    status: o.status,
    createdAt: o.created_at,
    tableNumber: o.dining_tables.number,
    waiterName: o.profiles.full_name.trim(),
    lines: o.order_items.map((l) => ({ id: l.id, quantity: l.quantity, note: l.note, name: l.menu_items.name, nameAm: l.menu_items.name_am })),
    leaving: false,
  };
}

async function fetchBoard(): Promise<Ticket[]> {
  const { data, error } = await supabase
    .from('orders')
    .select(SELECT)
    .in('status', [...KITCHEN_STATUSES])
    .order('created_at', { ascending: true })
    .order('id', { referencedTable: 'order_items' });
  if (error) throw error;
  return data.map(toTicket).filter((t): t is Ticket => t !== null);
}

async function fetchOne(id: number): Promise<Ticket | null> {
  const { data, error } = await supabase
    .from('orders')
    .select(SELECT)
    .eq('id', id)
    .order('id', { referencedTable: 'order_items' })
    .maybeSingle();
  if (error || !data) return null;
  return toTicket(data);
}

const animateLayout = () => LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

const byCreated = (a: Ticket, b: Ticket) => a.createdAt.localeCompare(b.createdAt) || a.id - b.id;

const rank = (status: LaneStatus) => KITCHEN_STATUSES.indexOf(status);

/**
 * Lays a fresh board snapshot over the live board.
 *
 * The snapshot is the truth for every order nothing touched while it was in flight. For an
 * order a Realtime event (or the cook's own tap) touched meanwhile, we can't tell whether the
 * snapshot was read before or after that change, so we keep whichever state is further along:
 * statuses only move forward, and anything the board already removed or is animating out stays
 * that way. Orders added during the fetch (an INSERT fetched by `fetchOne`) are kept even if the
 * snapshot was read before they existed. Tickets already sliding out finish their animation.
 */
function mergeBoard(snapshot: Ticket[], prev: Board | null, touched: ReadonlySet<number>): Board {
  const next: Board = new Map();
  for (const t of snapshot) {
    if (!touched.has(t.id)) {
      next.set(t.id, t);
      continue;
    }
    const cur = prev?.get(t.id);
    if (!cur) continue; // removed by a change newer than the snapshot
    next.set(t.id, cur.leaving || rank(cur.status) >= rank(t.status) ? cur : t);
  }
  for (const [id, cur] of prev ?? []) {
    if (!next.has(id) && (touched.has(id) || cur.leaving)) next.set(id, cur);
  }
  return next;
}

export default function KitchenScreen() {
  useKeepAwake();
  const strings = useT();
  const k = strings.kitchen;
  useOrientationLock('landscape');
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { profile, signOut } = useAuth();

  const [board, setBoard] = useState<Board | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [highlights, setHighlights] = useState<ReadonlySet<number>>(new Set());
  const [busy, setBusy] = useState<ReadonlySet<number>>(new Set());
  const [failed, setFailed] = useState<ReadonlySet<number>>(new Set());
  const [now, setNow] = useState(() => Date.now());
  const [backOnline, setBackOnline] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const boardRef = useRef<Board | null>(null);
  useEffect(() => {
    boardRef.current = board;
  }, [board]);

  // Board refetches can overlap (focus + SUBSCRIBED, Retry now). Each takes a number and only
  // the newest may write. `touched` collects the orders live changes updated since that newest
  // refetch started, so mergeBoard doesn't let its snapshot undo them.
  const loadSeq = useRef(0);
  const touched = useRef<Set<number>>(new Set());

  // Read through a ref so a language switch doesn't rebuild the realtime callbacks.
  const announceNew = useRef(k.announceNew);
  useEffect(() => {
    announceNew.current = k.announceNew;
  }, [k]);

  const highlight = useCallback((t: Ticket) => {
    setHighlights((prev) => new Set(prev).add(t.id));
    AccessibilityInfo.announceForAccessibility(announceNew.current(t.tableNumber));
  }, []);

  /** Puts tickets on the board (or replaces them), keeping the Map keyed by order id. */
  const upsert = useCallback((tickets: Ticket[]) => {
    for (const t of tickets) touched.current.add(t.id);
    animateLayout();
    setBoard((prev) => {
      const next = new Map(prev ?? []);
      for (const t of tickets) next.set(t.id, t);
      return next;
    });
  }, []);

  const markLeaving = useCallback((id: number) => {
    touched.current.add(id);
    setBoard((prev) => {
      const cur = prev?.get(id);
      if (!prev || !cur || cur.leaving) return prev;
      const next = new Map(prev);
      next.set(id, { ...cur, leaving: true });
      return next;
    });
  }, []);

  const removeNow = useCallback((id: number) => {
    touched.current.add(id);
    animateLayout();
    setBoard((prev) => {
      if (!prev?.has(id)) return prev;
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
  }, []);

  /**
   * Refetch the whole board. Runs on mount and every time the channel reports SUBSCRIBED,
   * because Realtime does not replay events missed while (re)connecting.
   * After the first load, a `sent` order that wasn't on the board gets the arrival highlight.
   * An older refetch that resolves after a newer one started is dropped; live changes that
   * landed while the fetch was in flight are merged back in (see mergeBoard).
   */
  const loadBoard = useCallback(
    async (opts?: { announceBackOnline?: boolean }) => {
      const seq = ++loadSeq.current;
      const changed = new Set<number>();
      touched.current = changed;
      let tickets: Ticket[];
      try {
        tickets = await fetchBoard();
      } catch {
        if (seq === loadSeq.current && !boardRef.current) setLoadError(true);
        return;
      }
      if (seq !== loadSeq.current) return;
      const before = boardRef.current;
      if (before) {
        // Orders a live event brought in were already highlighted by onChange.
        for (const t of tickets) if (t.status === SENT && !before.has(t.id) && !changed.has(t.id)) highlight(t);
      }
      animateLayout();
      setBoard((prev) => mergeBoard(tickets, prev, changed));
      setLoadError(false);
      if (opts?.announceBackOnline) setBackOnline(true);
    },
    [highlight],
  );

  const connectionRef = useRef<string>('connecting');

  const onChange = useCallback(
    async (change: OrderChange) => {
      if (change.eventType === 'DELETE') {
        if (change.old.id !== undefined) removeNow(change.old.id);
        return;
      }
      const row = change.new;
      if (!isLaneStatus(row.status)) {
        markLeaving(row.id);
        return;
      }
      const cur = boardRef.current?.get(row.id);
      if (cur) {
        if (cur.status !== row.status) {
          // The arrival highlight belongs to the New lane only.
          setHighlights((prev) => (prev.has(row.id) ? new Set([...prev].filter((id) => id !== row.id)) : prev));
          upsert([{ ...cur, status: row.status, leaving: false }]);
        }
        return;
      }
      // New to this board: fetch it with its table, waiter and lines.
      const t = await fetchOne(row.id);
      if (!t || boardRef.current?.has(t.id)) return;
      if (t.status === SENT) highlight(t);
      upsert([t]);
    },
    [highlight, markLeaving, removeNow, upsert],
  );

  const { connection, retry, stop } = useOrdersChannel({
    onChange,
    onSubscribed: () => loadBoard({ announceBackOnline: connectionRef.current === 'offline' }),
  });
  useEffect(() => {
    connectionRef.current = connection;
  }, [connection]);

  // First paint: fetch straight away (and on refocus); the SUBSCRIBED refetch follows.
  useFocusEffect(
    useCallback(() => {
      loadBoard();
    }, [loadBoard]),
  );

  // One interval drives every ticket timer and the clock.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), timing.timerTickMs);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!backOnline) return;
    const t = setTimeout(() => setBackOnline(false), timing.backOnlineMs);
    return () => clearTimeout(t);
  }, [backOnline]);

  // Nothing to go back to from the kitchen.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, []);

  const toggle = (set: (fn: (prev: ReadonlySet<number>) => ReadonlySet<number>) => void, id: number, on: boolean) =>
    set((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });

  const act = async (t: Ticket) => {
    const to = nextOrderStatus(t.status);
    if (!to) return;
    toggle(setFailed, t.id, false);
    toggle(setBusy, t.id, true);
    const result = await advanceOrder(t.id, t.status, to);
    toggle(setBusy, t.id, false);
    if (result.kind === 'failed') {
      toggle(setFailed, t.id, true);
      return;
    }
    const status = result.kind === 'ok' ? to : result.status;
    const cur = boardRef.current?.get(t.id);
    if (!cur) return;
    if (isLaneStatus(status)) {
      if (cur.status !== status) upsert([{ ...cur, status }]);
    } else markLeaving(t.id);
  };

  const retryNow = () => {
    retry();
    loadBoard();
  };

  const onSignOut = () =>
    confirmDestructive({
      title: strings.tables.signOutTitle,
      message: strings.tables.signOutMessage,
      confirmLabel: strings.common.signOut,
      cancelLabel: strings.common.cancel,
      onConfirm: async () => {
        setSigningOut(true);
        stop();
        await signOut();
        router.replace('/login');
      },
    });

  const tickets = board ? [...board.values()].sort(byCreated) : [];
  const lane = (status: LaneStatus) => tickets.filter((t) => t.status === status);
  const counts = (status: LaneStatus) => (board ? lane(status).filter((t) => !t.leaving).length : null);
  const quiet = board !== null && tickets.length === 0;
  const clock = formatTime(new Date(now).toISOString());
  const name = profile?.full_name.trim() || k.nameFallback;

  const renderTicket = (t: Ticket) =>
    t.status === READY ? (
      <ReadyTicket ticket={t} leaving={t.leaving} onGone={() => removeNow(t.id)} />
    ) : (
      <KitchenTicket
        ticket={t}
        now={now}
        highlighted={highlights.has(t.id)}
        onHighlightDone={() => toggle(setHighlights, t.id, false)}
        busy={busy.has(t.id)}
        failed={failed.has(t.id)}
        onAction={() => act(t)}
        leaving={t.leaving}
        onGone={() => removeNow(t.id)}
      />
    );

  const emptyLabel: Record<LaneStatus, string> = {
    [SENT]: k.noNew,
    [PREPARING]: k.nothingCooking,
    [READY]: k.nothingReady,
  };

  const laneBody = (status: LaneStatus) => {
    if (!board) {
      const n = status === SENT ? 2 : status === PREPARING ? 1 : 0;
      return (
        <View style={styles.laneContent}>
          {Array.from({ length: n }, (_, i) => (
            <Skeleton key={i}>
              <Bone style={styles.skeleton} />
            </Skeleton>
          ))}
        </View>
      );
    }
    const items = lane(status);
    if (items.length === 0) {
      if (status === SENT && quiet) {
        return (
          <View style={styles.quiet}>
            <EmptyState icon="restaurant-outline" title={k.quietTitle} body={k.quietBody} />
          </View>
        );
      }
      return <LaneEmpty label={emptyLabel[status]} />;
    }
    return (
      <FlatList
        data={items}
        keyExtractor={(t) => String(t.id)}
        contentContainerStyle={styles.laneContent}
        renderItem={({ item }) => renderTicket(item)}
      />
    );
  };

  const layout = width >= breakpoints.kitchenThreeLanes ? 3 : width >= breakpoints.kitchenTwoLanes ? 2 : 1;
  const readyTickets = lane(READY);
  const sidePad = { paddingLeft: spacing[6] + insets.left, paddingRight: spacing[6] + insets.right };

  let lanes;
  if (loadError) {
    lanes = (
      <View style={styles.center}>
        <EmptyState
          error
          icon="cloud-offline-outline"
          title={k.loadErrorTitle}
          body={strings.common.checkConnection}
          actionLabel={strings.common.tryAgain}
          onAction={() => {
            setLoadError(false);
            retryNow();
          }}
        />
      </View>
    );
  } else if (layout === 1) {
    lanes = (
      <ScrollView contentContainerStyle={[styles.phone, sidePad, { paddingBottom: spacing[4] + insets.bottom }]}>
        {KITCHEN_STATUSES.map((st) => (
          <View key={st} style={styles.phoneSection}>
            <LaneHeader status={st} count={counts(st)} />
            {lane(st).length === 0 ? (
              <LaneEmpty label={st === SENT && quiet ? k.quietTitle : emptyLabel[st]} />
            ) : (
              <View style={styles.laneContent}>
                {lane(st).map((t) => (
                  <View key={t.id}>{renderTicket(t)}</View>
                ))}
              </View>
            )}
          </View>
        ))}
      </ScrollView>
    );
  } else {
    lanes = (
      <View style={[styles.lanes, sidePad, { paddingBottom: spacing[4] + insets.bottom }]}>
        <KitchenLane status={SENT} count={counts(SENT)} flex={3}>
          {laneBody(SENT)}
        </KitchenLane>
        <KitchenLane status={PREPARING} count={counts(PREPARING)} flex={3}>
          {laneBody(PREPARING)}
        </KitchenLane>
        {layout === 3 ? (
          <KitchenLane status={READY} count={counts(READY)} flex={2}>
            {laneBody(READY)}
          </KitchenLane>
        ) : null}
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={[styles.topBar, sidePad, { paddingTop: insets.top + spacing[3] }]}>
        <View style={styles.who}>
          <Text style={[text('sm', 'medium'), { color: colors.textMuted }]}>{k.eyebrow}</Text>
          <Text numberOfLines={1} style={[text('xl', 'bold'), { color: colors.text }]}>
            {name}
          </Text>
        </View>
        <View pointerEvents="none" style={[styles.clockBox, { top: insets.top }]}>
          <Text accessibilityLabel={k.a11yTime(clock)} style={[text('3xl', 'bold'), tabularNums, { color: colors.text }]}>
            {clock}
          </Text>
        </View>
        <View style={styles.right}>
          <LanguageSwitch />
          <ConnectionPill state={connection} />
          <Button
            variant="ghost"
            icon="log-out-outline"
            label={strings.common.signOut}
            loading={signingOut}
            onPress={onSignOut}
            fullWidth={false}
          />
        </View>
      </View>

      {connection === 'offline' ? (
        <View style={[styles.bannerWrap, sidePad]}>
          <Banner title={k.lostTitle} body={k.lostBody} actionLabel={k.retryNow} onAction={retryNow} />
        </View>
      ) : backOnline ? (
        <View style={[styles.bannerWrap, sidePad]}>
          <Banner tone="success" body={k.backOnline} />
        </View>
      ) : null}

      {layout === 2 && readyTickets.length > 0 && !loadError ? (
        <View style={[styles.strip, sidePad]}>
          <View style={styles.stripLabel}>
            <Ionicons name="checkmark-circle-outline" size={spacing[6]} color={statusColors.ready.fg} />
            <Text style={[text('lg', 'bold'), { color: statusColors.ready.fg }]}>{k.lanes.ready}</Text>
          </View>
          <ScrollView horizontal contentContainerStyle={styles.stripChips} showsHorizontalScrollIndicator={false}>
            {readyTickets.map((t) => (
              <ReadyChip key={t.id} tableNumber={t.tableNumber} />
            ))}
          </ScrollView>
        </View>
      ) : null}

      {lanes}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  topBar: {
    minHeight: touch.minTarget + spacing[3] * 2,
    paddingBottom: spacing[3],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  who: { flexShrink: 1, maxWidth: '35%' },
  clockBox: { position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  right: { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  bannerWrap: { marginTop: spacing[4] },
  strip: { marginTop: spacing[4], flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  stripLabel: { flexDirection: 'row', alignItems: 'center', gap: spacing[1] },
  stripChips: { gap: spacing[2] },
  lanes: { flex: 1, flexDirection: 'row', gap: spacing[4], paddingTop: spacing[4] },
  laneContent: {
    paddingHorizontal: spacing[3],
    paddingTop: spacing[1],
    paddingBottom: spacing[3],
    gap: spacing[3],
  },
  skeleton: { height: spacing[16] * 4, borderRadius: radius.lg },
  quiet: { flex: 1, justifyContent: 'center' },
  center: { flex: 1, justifyContent: 'center' },
  phone: { paddingTop: spacing[4], gap: spacing[4] },
  phoneSection: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.xl,
  },
});
