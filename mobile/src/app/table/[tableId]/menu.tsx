import { router, useLocalSearchParams, useNavigation, usePreventRemove } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollViewInstance,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Tables } from '@shared/database.types';
import { Button } from '@/components/Button';
import { CART_BAR_SPACE, CartBar } from '@/components/CartBar';
import { Bone, EmptyState, Skeleton } from '@/components/Feedback';
import { MenuItemCard } from '@/components/MenuItemCard';
import { TopBarStack } from '@/components/TopBar';
import { confirmDestructive } from '@/lib/confirm';
import { useDraft, type DraftTable } from '@/lib/draft';
import { supabase } from '@/lib/supabase';
import { strings } from '@/strings';
import { colors, lineHeight, radius, size, spacing, text, touch } from '@/theme';

const s = strings.menu;

type Item = Pick<Tables<'menu_items'>, 'id' | 'category_id' | 'name' | 'price_etb' | 'sort_order'>;
type Category = Pick<Tables<'menu_categories'>, 'id' | 'name' | 'sort_order'>;
type Section = Category & { items: Item[] };

/** After a tab tap, ignore scroll-driven tab changes while the list animates there. */
const TAB_JUMP_LOCK_MS = 600;

async function fetchMenu(): Promise<Section[]> {
  const [cats, items] = await Promise.all([
    supabase.from('menu_categories').select('id, name, sort_order').order('sort_order'),
    supabase
      .from('menu_items')
      .select('id, category_id, name, price_etb, sort_order')
      .eq('is_available', true)
      .order('category_id')
      .order('sort_order'),
  ]);
  if (cats.error) throw cats.error;
  if (items.error) throw items.error;
  return cats.data
    .map((c) => ({ ...c, items: items.data.filter((i) => i.category_id === c.id) }))
    .filter((c) => c.items.length > 0);
}

function pairs<T>(list: T[]): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += 2) out.push(list.slice(i, i + 2));
  return out;
}

export default function MenuScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const params = useLocalSearchParams<{ tableId: string; number?: string; seats?: string }>();
  const tableId = Number(params.tableId);
  const draft = useDraft();

  const [table, setTable] = useState<DraftTable | null>(
    params.number && params.seats
      ? { id: tableId, number: Number(params.number), seats: Number(params.seats) }
      : null,
  );
  const [sections, setSections] = useState<Section[] | null>(null);
  const [error, setError] = useState(false);
  const [active, setActive] = useState<number | null>(null);

  const scrollRef = useRef<ScrollViewInstance>(null);
  const tabsRef = useRef<ScrollViewInstance>(null);
  const sectionY = useRef<Record<number, number>>({});
  const tabX = useRef<Record<number, number>>({});
  const jumpLocked = useRef(false);

  const load = useCallback(
    () =>
      Promise.all([
        fetchMenu(),
        table
          ? Promise.resolve(null)
          : supabase.from('dining_tables').select('id, number, seats').eq('id', tableId).single(),
      ]).then(
        ([menu, tableRow]) => {
          if (tableRow?.error) throw tableRow.error;
          if (tableRow?.data) setTable(tableRow.data);
          setSections(menu);
          setActive(menu[0]?.id ?? null);
        },
      ).catch(() => setError(true)),
    [table, tableId],
  );

  useEffect(() => {
    load();
    // Fetch once per visit; the menu doesn't change during a demo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const lines = useMemo(() => (draft.table?.id === tableId ? draft.lines : []), [draft.table, draft.lines, tableId]);
  const count = draft.table?.id === tableId ? draft.count : 0;
  const total = draft.table?.id === tableId ? draft.total : 0;
  const tableNumber = table?.number ?? tableId;

  const qtyByItem = useMemo(() => new Map(lines.map((l) => [l.menuItemId, l.quantity])), [lines]);
  const countByCategory = useMemo(() => {
    const m = new Map<number, number>();
    for (const sec of sections ?? []) {
      m.set(sec.id, sec.items.reduce((n, i) => n + (qtyByItem.get(i.id) ?? 0), 0));
    }
    return m;
  }, [sections, qtyByItem]);

  // Every way of leaving (back button, Android back, swipe) asks before dropping unsent items.
  usePreventRemove(count > 0, ({ data }) => {
    confirmDestructive({
      title: s.discardTitle,
      message: s.discardMessage(tableNumber),
      confirmLabel: s.discard,
      cancelLabel: s.keepEditing,
      onConfirm: () => {
        draft.clear();
        navigation.dispatch(data.action);
      },
    });
  });

  const onClear = () =>
    confirmDestructive({
      title: s.clearTitle,
      message: s.clearMessage(tableNumber),
      confirmLabel: s.clear,
      onConfirm: draft.clear,
    });

  const onAdd = (item: Item, categorySortOrder: number) => {
    if (!table) return;
    draft.add(table, {
      menuItemId: item.id,
      name: item.name,
      priceEtb: item.price_etb,
      categorySortOrder,
    });
    AccessibilityInfo.announceForAccessibility(s.a11yAdded(item.name));
  };

  const showTab = (id: number) => {
    const x = tabX.current[id];
    if (x !== undefined) tabsRef.current?.scrollTo({ x: Math.max(0, x - spacing[4]), animated: true });
  };

  const onTabPress = (id: number) => {
    setActive(id);
    showTab(id);
    jumpLocked.current = true;
    setTimeout(() => {
      jumpLocked.current = false;
    }, TAB_JUMP_LOCK_MS);
    const y = sectionY.current[id];
    if (y !== undefined) scrollRef.current?.scrollTo({ y: Math.max(0, y - spacing[2]), animated: true });
  };

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!sections || jumpLocked.current) return;
    const y = e.nativeEvent.contentOffset.y;
    let current = sections[0]?.id ?? null;
    for (const sec of sections) {
      const top = sectionY.current[sec.id];
      if (top !== undefined && top - spacing[2] <= y + 1) current = sec.id;
    }
    if (current !== null && current !== active) {
      setActive(current);
      showTab(current);
    }
  };

  const goToCart = () =>
    router.push({
      pathname: '/table/[tableId]/cart',
      params: { tableId, number: tableNumber, seats: table?.seats ?? '' },
    });

  const bottomSpace = count > 0 ? CART_BAR_SPACE + insets.bottom : insets.bottom + spacing[6];

  let body: React.ReactNode;
  if (error) {
    body = (
      <EmptyState
        error
        icon="cloud-offline-outline"
        title={s.errorTitle}
        body={strings.common.checkConnection}
        actionLabel={strings.common.tryAgain}
        onAction={() => {
          setError(false);
          load();
        }}
      />
    );
  } else if (!sections) {
    body = <MenuSkeleton />;
  } else if (sections.length === 0) {
    body = <EmptyState icon="restaurant-outline" title={s.emptyTitle} body={s.emptyBody} />;
  } else {
    body = (
      <>
        <ScrollView
          ref={tabsRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          accessibilityRole="tablist"
          style={styles.tabsBar}
          contentContainerStyle={styles.tabs}
        >
          {sections.map((sec) => {
            const selected = sec.id === active;
            const n = countByCategory.get(sec.id) ?? 0;
            return (
              <Pressable
                key={sec.id}
                onPress={() => onTabPress(sec.id)}
                onLayout={(e) => {
                  tabX.current[sec.id] = e.nativeEvent.layout.x;
                }}
                hitSlop={{ top: spacing[1], bottom: spacing[1] }}
                accessibilityRole="tab"
                accessibilityState={{ selected }}
                style={({ pressed }) => [
                  styles.tab,
                  selected ? styles.tabActive : pressed && { backgroundColor: colors.surfaceMuted },
                ]}
              >
                <Text
                  style={[text('sm', 'semibold'), { color: selected ? colors.textOnPrimary : colors.textMuted }]}
                >
                  {n > 0 ? s.tabWithCount(sec.name, n) : sec.name}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
        <ScrollView
          ref={scrollRef}
          onScroll={onScroll}
          scrollEventThrottle={16}
          contentContainerStyle={[styles.list, { paddingBottom: bottomSpace }]}
        >
          {sections.map((sec, index) => (
            <View
              key={sec.id}
              onLayout={(e) => {
                sectionY.current[sec.id] = e.nativeEvent.layout.y;
              }}
              style={{ paddingTop: index === 0 ? spacing[4] : spacing[5] }}
            >
              <View style={styles.sectionHeader}>
                <Text style={[text('lg', 'bold'), { color: colors.text }]}>{sec.name}</Text>
                <Text style={[text('sm'), { color: colors.textSubtle }]}>
                  {strings.common.itemCount(sec.items.length)}
                </Text>
              </View>
              <View style={styles.rows}>
                {pairs(sec.items).map((row) => (
                  <View key={row.map((i) => i.id).join('-')} style={styles.row}>
                    {row.map((item) => (
                      <MenuItemCard
                        key={item.id}
                        name={item.name}
                        priceEtb={item.price_etb}
                        categorySortOrder={sec.sort_order}
                        quantity={qtyByItem.get(item.id) ?? 0}
                        onAdd={() => onAdd(item, sec.sort_order)}
                        onIncrement={() => draft.increment(item.id)}
                        onDecrement={() => draft.decrement(item.id)}
                      />
                    ))}
                    {row.length === 1 ? <View style={styles.flex} /> : null}
                  </View>
                ))}
              </View>
            </View>
          ))}
        </ScrollView>
      </>
    );
  }

  return (
    <View style={styles.screen}>
      <TopBarStack
        title={strings.common.table(tableNumber)}
        subtitle={table ? s.subtitle(table.seats) : undefined}
        onBack={() => router.back()}
        right={
          count > 0 ? <Button variant="ghost" label={s.clear} onPress={onClear} fullWidth={false} /> : undefined
        }
      />
      {body}
      <CartBar count={count} total={total} onPress={goToCart} />
    </View>
  );
}

function MenuSkeleton() {
  const pillWidths = [spacing[16], spacing[16] + spacing[8], spacing[16] + spacing[4], spacing[16] + spacing[6]];
  return (
    <View>
      <View style={[styles.tabs, styles.tabsBar]}>
        {pillWidths.map((w) => (
          <Skeleton key={w}>
            <Bone style={{ width: w, height: spacing[10], borderRadius: radius.full }} />
          </Skeleton>
        ))}
      </View>
      <View style={styles.list}>
        <Skeleton style={styles.skeletonHeader}>
          <Bone style={{ width: spacing[16] * 2, height: spacing[5], borderRadius: radius.sm }} />
        </Skeleton>
        <View style={styles.rows}>
          {[0, 1].map((r) => (
            <View key={r} style={styles.row}>
              {[0, 1].map((c) => (
                <Skeleton key={c} style={styles.skeletonCard}>
                  <Bone style={{ height: size.tileCard }} />
                  <View style={styles.skeletonBody}>
                    <Bone style={{ height: lineHeight.md, width: '80%', borderRadius: radius.sm }} />
                    <Bone style={{ height: lineHeight.md, width: '50%', borderRadius: radius.sm }} />
                    <Bone style={{ height: touch.minTarget, borderRadius: radius.md }} />
                  </View>
                </Skeleton>
              ))}
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  tabsBar: {
    flexGrow: 0,
    flexShrink: 0,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tabs: { flexDirection: 'row', paddingHorizontal: spacing[4], paddingVertical: spacing[2], gap: spacing[2] },
  tab: {
    height: touch.minTarget - spacing[2],
    paddingHorizontal: spacing[4],
    borderRadius: radius.full,
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.borderControl,
  },
  tabActive: { backgroundColor: colors.text, borderColor: colors.text },
  list: { paddingHorizontal: spacing[4] },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: spacing[3],
  },
  rows: { gap: spacing[3] },
  row: { flexDirection: 'row', gap: spacing[3] },
  skeletonHeader: { paddingTop: spacing[4], marginBottom: spacing[3] },
  skeletonCard: {
    flex: 1,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  skeletonBody: { padding: spacing[3], gap: spacing[2] },
});
