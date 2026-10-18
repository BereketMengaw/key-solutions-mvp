import { router, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';

import type { OrderStatus } from '@shared/constants';
import { Banner, Bone, EmptyState, Skeleton } from '@/components/Feedback';
import { OrderCard, type OrderCardLine } from '@/components/OrderCard';
import { TopBarHome } from '@/components/TopBar';
import { useAuth } from '@/lib/auth';
import { startOfTodayIso } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import { strings } from '@/strings';
import { colors, radius, spacing, tabularNums, text } from '@/theme';

const s = strings.myOrders;
const PAID = 'paid' satisfies OrderStatus;

type Order = {
  id: number;
  status: OrderStatus;
  createdAt: string;
  tableNumber: number;
  lines: OrderCardLine[];
};

async function fetchMyOrders(userId: string): Promise<Order[]> {
  const { data, error } = await supabase
    .from('orders')
    .select(
      'id, status, created_at, dining_tables(number), order_items(id, quantity, note, unit_price_etb, menu_items(name))',
    )
    .eq('waiter_id', userId)
    .gte('created_at', startOfTodayIso())
    .order('created_at', { ascending: false })
    .order('id', { referencedTable: 'order_items' });
  if (error) throw error;
  return data.map((o) => ({
    id: o.id,
    status: o.status,
    createdAt: o.created_at,
    tableNumber: o.dining_tables.number,
    lines: o.order_items.map((l) => ({
      id: l.id,
      quantity: l.quantity,
      note: l.note,
      unitPriceEtb: l.unit_price_etb,
      name: l.menu_items.name,
    })),
  }));
}

export default function MyOrdersScreen() {
  const { session } = useAuth();
  const userId = session?.user.id;
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [firstError, setFirstError] = useState(false);
  const [refreshError, setRefreshError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const hasData = useRef(false);

  const load = useCallback(async () => {
    if (!userId) return;
    try {
      const next = await fetchMyOrders(userId);
      hasData.current = true;
      setOrders(next);
      setFirstError(false);
      setRefreshError(false);
    } catch {
      if (hasData.current) setRefreshError(true);
      else setFirstError(true);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const loading = !orders && !firstError;
  const openCount = orders?.filter((o) => o.status !== PAID).length ?? 0;

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
              <View style={styles.stats}>
                <Stat label={s.statOrders} value={orders.length} />
                <Stat label={s.statOpen} value={openCount} />
              </View>
              {refreshError ? (
                <Banner body={s.refreshError} actionLabel={strings.common.retry} onAction={load} />
              ) : null}
            </View>
          ) : refreshError ? (
            <Banner body={s.refreshError} actionLabel={strings.common.retry} onAction={load} />
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
          />
        )}
      />
    </View>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.stat}>
      <Text style={[text('xs', 'semibold'), { color: colors.textMuted }]}>{label}</Text>
      <Text style={[text('xl', 'bold'), tabularNums, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  list: { paddingHorizontal: spacing[4], paddingTop: spacing[2], paddingBottom: spacing[6], gap: spacing[3] },
  header: { gap: spacing[3], marginBottom: spacing[1] },
  stats: { flexDirection: 'row', gap: spacing[3] },
  stat: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
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
