import { router, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { FlatList, LayoutAnimation, RefreshControl, StyleSheet, View } from 'react-native';

import type { OrderStatus, PaymentMethod } from '@shared/constants';
import { Text } from '@/components/Text';
import { Banner, Bone, EmptyState, Skeleton } from '@/components/Feedback';
import { OrderCard, orderTotal, type OrderCardLine } from '@/components/OrderCard';
import { PaymentSheet } from '@/components/PaymentSheet';
import { TopBarHome } from '@/components/TopBar';
import { useAuth } from '@/lib/auth';
import { startOfTodayIso } from '@/lib/format';
import { useLive, useLiveRefetch } from '@/lib/live';
import { PAID, READY, SERVED } from '@/lib/names';
import { advanceOrder } from '@/lib/orders';
import { supabase } from '@/lib/supabase';
import { useT } from '@/lib/i18n';
import { colors, radius, spacing, tabularNums, text } from '@/theme';

type Order = {
  id: number;
  status: OrderStatus;
  createdAt: string;
  tableNumber: number;
  paymentMethod: PaymentMethod | null;
  lines: OrderCardLine[];
};

/** Ready first (oldest first), then open orders (newest first), then paid (newest first). */
function sortOrders(orders: Order[]): Order[] {
  const group = (o: Order) => (o.status === READY ? 0 : o.status === PAID ? 2 : 1);
  return [...orders].sort((a, b) => {
    const g = group(a) - group(b);
    if (g !== 0) return g;
    const byTime = a.createdAt.localeCompare(b.createdAt);
    return group(a) === 0 ? byTime : -byTime;
  });
}

async function fetchMyOrders(userId: string): Promise<Order[]> {
  const { data, error } = await supabase
    .from('orders')
    .select(
      'id, status, payment_method, created_at, dining_tables(number), order_items(id, quantity, note, unit_price_etb, menu_items(name, name_am))',
    )
    .eq('waiter_id', userId)
    .gte('created_at', startOfTodayIso())
    .order('created_at', { ascending: false })
    .order('id', { referencedTable: 'order_items' });
  if (error) throw error;
  const orders = data.map((o) => ({
    id: o.id,
    status: o.status,
    createdAt: o.created_at,
    tableNumber: o.dining_tables.number,
    paymentMethod: o.payment_method,
    lines: o.order_items.map((l) => ({
      id: l.id,
      quantity: l.quantity,
      note: l.note,
      unitPriceEtb: l.unit_price_etb,
      name: l.menu_items.name,
      nameAm: l.menu_items.name_am,
    })),
  }));
  return sortOrders(orders);
}

export default function MyOrdersScreen() {
  const strings = useT();
  const s = strings.myOrders;
  const { session } = useAuth();
  const userId = session?.user.id;
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [firstError, setFirstError] = useState(false);
  const [refreshError, setRefreshError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState<number | null>(null);
  const [actionError, setActionError] = useState<{ id: number; message: string } | null>(null);
  const [paying, setPaying] = useState<Order | null>(null);
  const [paySaving, setPaySaving] = useState(false);
  const [payFailed, setPayFailed] = useState(false);
  const live = useLive();
  const hasData = useRef(false);
  // Focus, pull-to-refresh, live refetches and post-action refetches can overlap. Each load
  // takes a number; only the newest one may write, so a slow older response never replaces
  // a newer list (or flags an error after a newer load succeeded).
  const loadSeq = useRef(0);

  const load = useCallback(async () => {
    if (!userId) return;
    const seq = ++loadSeq.current;
    try {
      const next = await fetchMyOrders(userId);
      if (seq !== loadSeq.current) return;
      if (hasData.current) LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      hasData.current = true;
      setOrders(next);
      setFirstError(false);
      setRefreshError(false);
    } catch {
      if (seq !== loadSeq.current) return;
      if (hasData.current) setRefreshError(true);
      else setFirstError(true);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );
  useLiveRefetch(load);

  /** Not optimistic: the card changes when the refetch after the update lands. */
  const markServed = async (o: Order) => {
    setActionError(null);
    setBusy(o.id);
    const result = await advanceOrder(o.id, READY, SERVED);
    if (result.kind === 'failed') setActionError({ id: o.id, message: s.servedFailed(o.tableNumber) });
    await load();
    setBusy(null);
  };

  const confirmPaid = async (method: PaymentMethod) => {
    if (!paying) return;
    setPayFailed(false);
    setPaySaving(true);
    const result = await advanceOrder(paying.id, SERVED, PAID, method);
    setPaySaving(false);
    if (result.kind === 'failed') {
      setPayFailed(true);
      return;
    }
    setPaying(null);
    await load();
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const loading = !orders && !firstError;
  const openCount = orders?.filter((o) => o.status !== PAID).length ?? 0;
  const readyCount = orders?.filter((o) => o.status === READY).length ?? 0;
  const pausedBanner = live.paused ? <Banner tone="info" body={strings.live.paused} /> : null;

  const topBar = <TopBarHome eyebrow={s.eyebrow} title={s.title} />;

  if (loading) {
    return (
      <View style={styles.screen}>
        {topBar}
        <View style={styles.list}>
          <View style={styles.stats}>
            <Skeleton style={styles.flex}>
              <Bone style={styles.statBone} />
            </Skeleton>
            <Skeleton style={styles.flex}>
              <Bone style={styles.statBone} />
            </Skeleton>
          </View>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} style={styles.skeletonCard}>
              <View style={styles.row}>
                <Bone style={styles.boneTable} />
                <Bone style={styles.boneBadge} />
              </View>
              <Bone style={styles.boneLine} />
              <Bone style={[styles.boneLine, styles.boneLineShort]} />
            </Skeleton>
          ))}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      {topBar}
      <FlatList
        data={orders ?? []}
        keyExtractor={(o) => String(o.id)}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />
        }
        ListHeaderComponent={
          orders && orders.length > 0 ? (
            <View style={styles.header}>
              {pausedBanner}
              <View style={styles.stats}>
                <Stat label={s.statOrders} value={orders.length} />
                <Stat label={s.statOpen} value={openCount} />
                <Stat label={s.statReady} value={readyCount} highlight={readyCount > 0} />
              </View>
              {refreshError ? (
                <Banner body={s.refreshError} actionLabel={strings.common.retry} onAction={load} />
              ) : null}
            </View>
          ) : refreshError || live.paused ? (
            <View style={styles.header}>
              {pausedBanner}
              {refreshError ? (
                <Banner body={s.refreshError} actionLabel={strings.common.retry} onAction={load} />
              ) : null}
            </View>
          ) : undefined
        }
        ListEmptyComponent={
          firstError ? (
            <EmptyState
              error
              icon="cloud-offline-outline"
              title={s.errorTitle}
              body={strings.common.checkConnection}
              actionLabel={strings.common.tryAgain}
              onAction={() => {
                setFirstError(false);
                load();
              }}
            />
          ) : (
            <EmptyState
              icon="receipt-outline"
              title={s.emptyTitle}
              body={s.emptyBody}
              actionLabel={s.goToTables}
              onAction={() => router.navigate('/tables')}
            />
          )
        }
        renderItem={({ item }) => (
          <OrderCard
            id={item.id}
            tableNumber={item.tableNumber}
            status={item.status}
            createdAt={item.createdAt}
            lines={item.lines}
            paymentMethod={item.paymentMethod}
            actionBusy={busy === item.id}
            actionError={actionError?.id === item.id ? actionError.message : null}
            onAction={
              item.status === READY
                ? () => markServed(item)
                : item.status === SERVED
                  ? () => {
                      setActionError(null);
                      setPayFailed(false);
                      setPaying(item);
                    }
                  : undefined
            }
            highlighted={live.justReady.has(item.id) && item.status === READY}
            onHighlightDone={() => live.clearJustReady(item.id)}
          />
        )}
      />
      <PaymentSheet
        order={paying ? { id: paying.id, tableNumber: paying.tableNumber, total: strings.common.money(orderTotal(paying.lines)) } : null}
        saving={paySaving}
        failed={payFailed}
        onConfirm={confirmPaid}
        onClose={() => setPaying(null)}
      />
    </View>
  );
}

function Stat({ label, value, highlight = false }: { label: string; value: number; highlight?: boolean }) {
  return (
    <View style={styles.stat}>
      <Text style={[text('xs', 'semibold'), { color: colors.textMuted }]}>{label}</Text>
      <Text style={[text('xl', 'bold'), tabularNums, { color: highlight ? colors.success : colors.text }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  list: { paddingHorizontal: spacing[4], paddingTop: spacing[2], paddingBottom: spacing[6], gap: spacing[3] },
  header: { gap: spacing[3], marginBottom: spacing[1] },
  stats: { flexDirection: 'row', gap: spacing[2] },
  stat: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing[3],
  },
  statBone: { height: spacing[16] + spacing[2], borderRadius: radius.lg },
  skeletonCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing[4],
    gap: spacing[3],
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  boneTable: { width: spacing[16], height: spacing[5], borderRadius: radius.sm },
  boneBadge: { width: spacing[16] + spacing[4], height: spacing[6], borderRadius: radius.full },
  boneLine: { height: spacing[4], borderRadius: radius.sm, width: '90%' },
  boneLineShort: { width: '70%' },
});
