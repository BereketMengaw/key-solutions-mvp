import { router, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';

import type { OrderStatus } from '@shared/constants';
import type { Tables as Row } from '@shared/database.types';
import { Button } from '@/components/Button';
import { Banner, Bone, EmptyState, Skeleton } from '@/components/Feedback';
import { TableCard } from '@/components/TableCard';
import { TopBarHome } from '@/components/TopBar';
import { useAuth } from '@/lib/auth';
import { confirmDestructive } from '@/lib/confirm';
import { useDraft } from '@/lib/draft';
import { supabase } from '@/lib/supabase';
import { strings } from '@/strings';
import { colors, radius, size, spacing, text } from '@/theme';

const s = strings.tables;
const PAID = 'paid' satisfies OrderStatus;
const SKELETON_COUNT = 8;

type DiningTable = Row<'dining_tables'>;
type OpenInfo = { status: OrderStatus; count: number; latestAt: string };
type Data = { tables: DiningTable[]; open: Record<number, OpenInfo> };

function greeting(now = new Date()): string {
  const h = now.getHours();
  return h < 12 ? s.greetingMorning : h < 17 ? s.greetingAfternoon : s.greetingEvening;
}

async function fetchTables(): Promise<Data> {
  const [tablesRes, ordersRes] = await Promise.all([
    supabase.from('dining_tables').select('id, number, seats').order('number'),
    supabase.from('orders').select('id, table_id, status, created_at').neq('status', PAID),
  ]);
  if (tablesRes.error) throw tablesRes.error;
  if (ordersRes.error) throw ordersRes.error;

  const open: Record<number, OpenInfo> = {};
  for (const o of ordersRes.data) {
    const cur = open[o.table_id];
    if (!cur) open[o.table_id] = { status: o.status, count: 1, latestAt: o.created_at };
    else {
      cur.count += 1;
      if (o.created_at > cur.latestAt) {
        cur.status = o.status;
        cur.latestAt = o.created_at;
      }
    }
  }
  return { tables: tablesRes.data, open };
}

export default function TablesScreen() {
  const { profile, signOut } = useAuth();
  const { clear } = useDraft();
  const [data, setData] = useState<Data | null>(null);
  const [firstError, setFirstError] = useState(false);
  const [refreshError, setRefreshError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const hasData = useRef(false);

  const load = useCallback(async () => {
    try {
      const next = await fetchTables();
      hasData.current = true;
      setData(next);
      setFirstError(false);
      setRefreshError(false);
    } catch {
      if (hasData.current) setRefreshError(true);
      else setFirstError(true);
    }
  }, []);

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

  const retryFirst = () => {
    setFirstError(false);
    load();
  };

  const onSignOut = () =>
    confirmDestructive({
      title: s.signOutTitle,
      message: s.signOutMessage,
      confirmLabel: strings.common.signOut,
      onConfirm: async () => {
        setSigningOut(true);
        clear();
        await signOut();
        router.replace('/login');
      },
    });

  const name = profile?.full_name.trim() || s.nameFallback;
  const tables = data?.tables ?? [];
  const openCount = tables.filter((t) => data?.open[t.id]).length;
  const loading = !data && !firstError;

  const header = (
    <View>
      {data && tables.length > 0 ? (
        <Text style={[text('sm'), styles.summary]}>
          {openCount === 0 ? s.allFree(tables.length) : s.summary(tables.length - openCount, openCount)}
        </Text>
      ) : null}
      {refreshError ? (
        <View style={styles.banner}>
          <Banner body={s.refreshError} actionLabel={strings.common.retry} onAction={load} />
        </View>
      ) : null}
      <Text style={[text('lg', 'bold'), styles.section]}>{s.pickTable}</Text>
      {firstError ? (
        <EmptyState
          error
          icon="cloud-offline-outline"
          title={s.errorTitle}
          body={strings.common.checkConnection}
          actionLabel={strings.common.tryAgain}
          onAction={retryFirst}
        />
      ) : null}
      {data && tables.length === 0 ? (
        <EmptyState icon="grid-outline" title={s.emptyTitle} body={s.emptyBody} />
      ) : null}
    </View>
  );

  return (
    <View style={styles.screen}>
      <TopBarHome
        eyebrow={greeting()}
        title={name}
        right={
          <Button
            variant="ghost"
            icon="log-out-outline"
            label={strings.common.signOut}
            loading={signingOut}
            onPress={onSignOut}
            fullWidth={false}
          />
        }
      />
      {loading ? (
        <View style={styles.list}>
          {header}
          <View style={styles.skeletonGrid}>
            {Array.from({ length: SKELETON_COUNT }, (_, i) => (
              <Skeleton key={i} style={styles.skeletonCard}>
                <Bone style={styles.boneLabel} />
                <Bone style={styles.boneNumber} />
              </Skeleton>
            ))}
          </View>
        </View>
      ) : (
        <FlatList
          data={tables}
          keyExtractor={(t) => String(t.id)}
          numColumns={2}
          ListHeaderComponent={header}
          contentContainerStyle={styles.list}
          columnWrapperStyle={styles.column}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
          renderItem={({ item }) => {
            const open = data?.open[item.id];
            return (
              <TableCard
                number={item.number}
                seats={item.seats}
                openStatus={open?.status ?? null}
                openCount={open?.count ?? 0}
                onPress={() =>
                  router.push({
                    pathname: '/table/[tableId]/menu',
                    params: { tableId: item.id, number: item.number, seats: item.seats },
                  })
                }
              />
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  list: { paddingHorizontal: spacing[4], paddingBottom: spacing[6], gap: spacing[3] },
  column: { gap: spacing[3] },
  summary: { marginTop: spacing[2], color: colors.textMuted },
  banner: { marginTop: spacing[3] },
  section: { marginTop: spacing[4], color: colors.text },
  skeletonGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[3] },
  skeletonCard: {
    flexBasis: '40%',
    flexGrow: 1,
    minHeight: size.tableCard,
    padding: spacing[4],
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing[2],
  },
  boneLabel: { width: spacing[10], height: spacing[3], borderRadius: radius.sm },
  boneNumber: { width: spacing[8], height: spacing[10], borderRadius: radius.sm },
});
