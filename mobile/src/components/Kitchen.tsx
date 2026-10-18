// Kitchen board building blocks: StatusSolidButton, ConnectionPill, KitchenLane, KitchenTicket, ReadyTicket.
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, Animated, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import type { OrderStatus } from '@shared/constants';
import { formatTime, minutesSince } from '@/lib/format';
import { KITCHEN_STATUSES, PREPARING, READY, SENT } from '@/lib/names';
import type { Connection } from '@/lib/realtime';
import { strings } from '@/strings';
import {
  colors,
  lineHeight,
  radius,
  shadow,
  size,
  spacing,
  statusColors,
  statusSolid,
  tabularNums,
  text,
  timing,
  touch,
} from '@/theme';
import type { IconName } from './Button';
import { Banner } from './Feedback';
import { HighlightRing, useHighlightFade } from './HighlightRing';
import { StatusBadge } from './StatusBadge';

const k = strings.kitchen;
const nativeDriver = Platform.OS !== 'web';

export type KitchenLine = { id: number; quantity: number; note: string; name: string };
export type LaneStatus = (typeof KITCHEN_STATUSES)[number];

export const laneIcons: Record<LaneStatus, IconName> = {
  sent: 'paper-plane-outline',
  preparing: 'flame-outline',
  ready: 'checkmark-circle-outline',
};

/* ---------------------------------------------------------------- StatusSolidButton */

type SolidProps = {
  target: OrderStatus;
  icon: IconName;
  label: string;
  loadingLabel: string;
  loading: boolean;
  onPress: () => void;
};

export function StatusSolidButton({ target, icon, label, loadingLabel, loading, onPress }: SolidProps) {
  const c = statusSolid[target];
  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      accessibilityRole="button"
      accessibilityLabel={loading ? loadingLabel : label}
      accessibilityState={{ disabled: loading, busy: loading }}
      style={({ pressed }) => [styles.solid, { backgroundColor: pressed && !loading ? c.pressed : c.bg }]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={c.fg} />
      ) : (
        <Ionicons name={icon} size={size.iconLg} color={c.fg} />
      )}
      <Text style={[text('xl', 'bold'), { color: c.fg }]}>{loading ? loadingLabel : label}</Text>
    </Pressable>
  );
}

/* ---------------------------------------------------------------- ConnectionPill */

const pillLook: Record<Connection, { bg: string; fg: string }> = {
  connecting: { bg: colors.surfaceMuted, fg: colors.textMuted },
  live: { bg: colors.successSoft, fg: colors.success },
  reconnecting: { bg: colors.warningSoft, fg: colors.warning },
  offline: { bg: colors.dangerSoft, fg: colors.danger },
};

export function ConnectionPill({ state }: { state: Connection }) {
  const look = pillLook[state];
  const label = k.connection[state];
  return (
    <View
      accessible
      accessibilityLabel={k.a11yConnection(label)}
      accessibilityLiveRegion="polite"
      style={[styles.pill, { backgroundColor: look.bg }]}
    >
      {state === 'live' ? (
        <View style={[styles.dot, { backgroundColor: look.fg }]} />
      ) : state === 'offline' ? (
        <Ionicons name="cloud-offline-outline" size={size.icon} color={look.fg} />
      ) : (
        <ActivityIndicator size="small" color={look.fg} />
      )}
      <Text style={[text('md', 'semibold'), { color: look.fg }]}>{label}</Text>
    </View>
  );
}

/* ---------------------------------------------------------------- KitchenLane */

export function LaneHeader({ status, count }: { status: LaneStatus; count: number | null }) {
  const c = statusColors[status];
  const label = k.lanes[status];
  return (
    <View
      accessible
      accessibilityRole="header"
      accessibilityLabel={k.a11yLane(label, count ?? 0)}
      style={styles.laneHeader}
    >
      <View style={styles.laneTitle}>
        <Ionicons name={laneIcons[status]} size={size.iconLg} color={c.fg} />
        <Text style={[text('xl', 'bold'), { color: c.fg }]}>{label}</Text>
      </View>
      {count === null ? null : (
        <View style={[styles.count, { backgroundColor: c.bg }]}>
          <Text style={[text('lg', 'bold'), tabularNums, { color: c.fg }]}>{count}</Text>
        </View>
      )}
    </View>
  );
}

export function KitchenLane({
  status,
  count,
  flex,
  children,
}: {
  status: LaneStatus;
  count: number | null;
  flex: number;
  children: ReactNode;
}) {
  return (
    <View style={[styles.lane, { flex, borderTopColor: statusColors[status].fg }]}>
      <LaneHeader status={status} count={count} />
      {children}
    </View>
  );
}

export function LaneEmpty({ label }: { label: string }) {
  return <Text style={[text('lg'), styles.laneEmpty]}>{label}</Text>;
}

/* ---------------------------------------------------------------- Enter / leave */

/** Fades + slides in on mount; fades out when `leaving` turns true, then calls onGone. */
function EnterLeave({ leaving, onGone, children }: { leaving: boolean; onGone: () => void; children: ReactNode }) {
  const [anim] = useState(() => new Animated.Value(0));
  useEffect(() => {
    Animated.timing(anim, { toValue: 1, duration: timing.enterMs, useNativeDriver: nativeDriver }).start();
  }, [anim]);
  useEffect(() => {
    if (!leaving) return;
    Animated.timing(anim, { toValue: 0, duration: timing.enterMs, useNativeDriver: nativeDriver }).start(() =>
      onGone(),
    );
    // onGone is stable per ticket id for the board.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leaving, anim]);
  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [-spacing[4], 0] });
  return <Animated.View style={{ opacity: anim, transform: [{ translateY }] }}>{children}</Animated.View>;
}

/* ---------------------------------------------------------------- Timer */

export function waitLabel(minutes: number): string {
  if (minutes === 0) return k.justNow;
  if (minutes < 60) return k.minutes(minutes);
  return k.hours(Math.floor(minutes / 60), minutes % 60);
}

function Timer({ minutes, late }: { minutes: number; late: boolean }) {
  const label = waitLabel(minutes);
  if (late) {
    return (
      <View style={styles.lateChip}>
        <Ionicons name="alert-circle" size={size.iconLg} color={colors.textOnOverdue} />
        <Text style={[text('2xl', 'bold'), tabularNums, { color: colors.textOnOverdue }]}>{k.late(label)}</Text>
      </View>
    );
  }
  return (
    <View style={styles.timer}>
      <Ionicons name="time-outline" size={size.iconLg} color={colors.text} />
      <Text style={[text('2xl', 'bold'), tabularNums, { color: colors.text }]}>{label}</Text>
    </View>
  );
}

/* ---------------------------------------------------------------- KitchenTicket */

export type TicketData = {
  id: number;
  status: LaneStatus;
  createdAt: string;
  tableNumber: number;
  waiterName: string;
  lines: KitchenLine[];
};

type TicketProps = {
  ticket: TicketData;
  now: number;
  highlighted: boolean;
  onHighlightDone: () => void;
  busy: boolean;
  failed: boolean;
  onAction: () => void;
  leaving: boolean;
  onGone: () => void;
};

function NewHighlight({
  onDone,
  children,
}: {
  onDone: () => void;
  children: (opacity: Animated.Value) => ReactNode;
}) {
  const opacity = useHighlightFade(onDone);
  return <>{children(opacity)}</>;
}

export function KitchenTicket(props: TicketProps) {
  const { ticket, now, highlighted, onHighlightDone, busy, failed, onAction, leaving, onGone } = props;
  const minutes = minutesSince(ticket.createdAt, now);
  const late = minutes >= timing.overdueAfterMinutes;
  const c = statusColors[ticket.status];
  const isNew = ticket.status === SENT;
  const statusWord = k.lanes[ticket.status];
  const a11y = k.a11yTicket(
    ticket.tableNumber,
    statusWord,
    k.a11ySentAgo(minutes),
    ticket.lines.map((l) => k.a11yItem(l.quantity, l.name, l.note)).join(', '),
    late,
  );

  const body = (tagOpacity: Animated.Value | null) => (
    <View style={[styles.ticket, late && styles.ticketLate]}>
      <View accessible accessibilityLabel={a11y}>
        <View style={[styles.band, { backgroundColor: c.bg }]}>
          <View style={styles.bandLeft}>
            <View style={styles.tableRow}>
              <Text numberOfLines={1} style={[text('4xl', 'bold'), tabularNums, styles.tableNo]}>
                {strings.common.table(ticket.tableNumber)}
              </Text>
              {tagOpacity ? (
                <Animated.View style={[styles.newTag, { opacity: tagOpacity }]}>
                  <Text style={[text('sm', 'bold'), styles.newTagText]}>{k.newTag}</Text>
                </Animated.View>
              ) : null}
            </View>
            <View style={styles.statusWord}>
              <Ionicons name={laneIcons[ticket.status]} size={size.icon} color={c.fg} />
              <Text style={[text('md', 'semibold'), { color: c.fg }]}>{statusWord}</Text>
            </View>
            {late ? (
              // The Late chip is too wide to sit beside "Table N" in a lane, so it gets its own line.
              <View style={styles.lateRow}>
                <Timer minutes={minutes} late />
              </View>
            ) : null}
          </View>
          {late ? null : (
            <View style={styles.timerBox}>
              <Timer minutes={minutes} late={false} />
            </View>
          )}
        </View>
        <Text numberOfLines={1} style={[text('lg'), tabularNums, styles.meta]}>
          {k.meta(ticket.id, ticket.waiterName || k.waiterFallback, formatTime(ticket.createdAt))}
        </Text>
        <View style={styles.divider} />
        <View style={styles.items}>
          {ticket.lines.map((l) => (
            <View key={l.id} style={styles.itemRow}>
              <Text style={[text('2xl', 'bold'), tabularNums, styles.qty]}>{k.qty(l.quantity)}</Text>
              <View style={styles.flex}>
                <Text style={[text('2xl', 'semibold'), { color: colors.text }]}>{l.name}</Text>
                {l.note ? (
                  <View style={styles.note}>
                    <Text style={[text('xl', 'medium'), { color: colors.text }]}>{k.note(l.note)}</Text>
                  </View>
                ) : null}
              </View>
            </View>
          ))}
        </View>
      </View>
      {failed ? <Banner body={k.updateFailed(ticket.tableNumber)} style={styles.ticketError} /> : null}
      <View style={styles.action}>
        {isNew ? (
          <StatusSolidButton
            target={PREPARING}
            icon="flame"
            label={k.startPreparing}
            loadingLabel={k.starting}
            loading={busy}
            onPress={onAction}
          />
        ) : (
          <StatusSolidButton
            target={READY}
            icon="checkmark-circle"
            label={k.markReady}
            loadingLabel={k.markingReady}
            loading={busy}
            onPress={onAction}
          />
        )}
      </View>
    </View>
  );

  return (
    <EnterLeave leaving={leaving} onGone={onGone}>
      {highlighted && isNew ? (
        <NewHighlight onDone={onHighlightDone}>
          {(opacity) => (
            <View>
              {body(opacity)}
              <HighlightRing color={statusColors.sent.fg} opacity={opacity} />
            </View>
          )}
        </NewHighlight>
      ) : (
        body(null)
      )}
    </EnterLeave>
  );
}

/* ---------------------------------------------------------------- ReadyTicket */

export function ReadyTicket({ ticket, leaving, onGone }: { ticket: TicketData; leaving: boolean; onGone: () => void }) {
  const items = ticket.lines.reduce((n, l) => n + l.quantity, 0);
  return (
    <EnterLeave leaving={leaving} onGone={onGone}>
      <View style={styles.ready}>
        <View style={styles.readyRow}>
          <Text style={[text('2xl', 'bold'), tabularNums, { color: colors.text }]}>
            {strings.common.table(ticket.tableNumber)}
          </Text>
          <StatusBadge status={READY} large />
        </View>
        <Text numberOfLines={1} style={[text('lg'), { color: colors.textMuted }]}>
          {k.readyMeta(strings.common.itemCount(items), ticket.waiterName || k.waiterFallback)}
        </Text>
        <Text style={[text('md', 'medium'), { color: colors.success }]}>{k.waitingPickup}</Text>
      </View>
    </EnterLeave>
  );
}

/** Ready strip chip (two-lane layout). */
export function ReadyChip({ tableNumber }: { tableNumber: number }) {
  return (
    <View style={styles.chip}>
      <Text style={[text('lg', 'bold'), tabularNums, { color: statusColors.ready.fg }]}>
        {strings.common.table(tableNumber)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  solid: {
    minHeight: touch.kitchenAction,
    borderRadius: radius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[3],
    paddingHorizontal: spacing[5],
    ...shadow('md'),
  },
  pill: {
    height: spacing[10],
    paddingHorizontal: spacing[4],
    borderRadius: radius.full,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  dot: { width: spacing[2], height: spacing[2], borderRadius: radius.full },
  lane: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.xl,
    overflow: 'hidden',
    borderTopWidth: size.laneEdge,
  },
  laneHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  laneTitle: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  count: {
    minWidth: spacing[10],
    minHeight: spacing[10],
    paddingHorizontal: spacing[3],
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  laneEmpty: { color: colors.textMuted, textAlign: 'center', padding: spacing[6] },
  ticket: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    ...shadow('md'),
  },
  ticketLate: { borderWidth: 3, borderColor: colors.overdue },
  band: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[5],
    gap: spacing[3],
  },
  bandLeft: { flex: 1 },
  lateRow: { marginTop: spacing[2], flexDirection: 'row' },
  tableNo: { color: colors.text, flexShrink: 0 },
  tableRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[3], flexWrap: 'wrap' },
  newTag: {
    backgroundColor: statusSolid.sent.bg,
    paddingVertical: spacing[1],
    paddingHorizontal: spacing[2],
    borderRadius: radius.full,
  },
  newTagText: { color: statusSolid.sent.fg, letterSpacing: 1 },
  statusWord: { flexDirection: 'row', alignItems: 'center', gap: spacing[1] },
  timerBox: { minHeight: lineHeight['4xl'], justifyContent: 'center', flexShrink: 0 },
  timer: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  lateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    backgroundColor: colors.overdue,
    paddingVertical: spacing[1],
    paddingHorizontal: spacing[3],
    borderRadius: radius.full,
  },
  meta: { color: colors.textMuted, paddingHorizontal: spacing[5], paddingTop: spacing[3] },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing[3], marginHorizontal: spacing[5] },
  items: { paddingHorizontal: spacing[5], gap: spacing[3] },
  itemRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing[2] },
  qty: { color: colors.text, minWidth: spacing[12] },
  note: {
    marginTop: spacing[1],
    backgroundColor: colors.surfaceMuted,
    borderLeftWidth: 4,
    borderLeftColor: colors.borderControl,
    borderRadius: radius.sm,
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
  },
  ticketError: { marginHorizontal: spacing[5], marginTop: spacing[4] },
  action: { marginTop: spacing[4], marginHorizontal: spacing[5], marginBottom: spacing[5] },
  ready: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: statusColors.ready.fg,
    padding: spacing[4],
    gap: spacing[1],
    ...shadow('sm'),
  },
  readyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing[2] },
  chip: {
    backgroundColor: statusColors.ready.bg,
    borderWidth: 2,
    borderColor: statusColors.ready.fg,
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[4],
    borderRadius: radius.full,
  },
});
