import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { OrderStatus } from '@shared/constants';
import { READY } from '@/lib/names';
import { strings } from '@/strings';
import { colors, radius, shadow, size, spacing, tabularNums, text } from '@/theme';
import { StatusBadge } from './StatusBadge';

type Props = {
  number: number;
  seats: number;
  /** Most recent open order's status, or null when the table is free. */
  openStatus: OrderStatus | null;
  openCount: number;
  /** Any open order on the table is ready: the card shows the pick-up look. */
  ready: boolean;
  onPress: () => void;
};

export function TableCard({ number, seats, openStatus, openCount, ready, onPress }: Props) {
  const open = openStatus !== null;
  const badge = ready ? READY : openStatus;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={
        ready
          ? strings.tables.a11yReady(number, seats)
          : open
            ? strings.tables.a11yOpen(number, seats, strings.status[openStatus])
            : strings.tables.a11yFree(number, seats)
      }
      style={({ pressed }) => [
        styles.card,
        open && styles.open,
        ready && styles.ready,
        pressed && (ready ? styles.readyPressed : open ? styles.openPressed : styles.freePressed),
      ]}
    >
      <View style={styles.topRow}>
        <Text style={[text('xs', 'semibold'), styles.label]}>{strings.tables.cardLabel}</Text>
        <View style={styles.seats} accessibilityLabel={strings.tables.seats(seats)}>
          <Ionicons name="people-outline" size={size.iconSm} color={colors.textMuted} />
          <Text style={[text('sm'), { color: colors.textMuted }]}>{seats}</Text>
        </View>
      </View>
      <Text style={[text('3xl', 'bold'), tabularNums, { color: colors.text }]}>{number}</Text>
      <View style={styles.bottom}>
        {badge ? (
          <>
            <StatusBadge status={badge} />
            {openCount > 1 ? (
              <Text style={[text('xs'), { color: colors.textMuted }]}>
                {strings.tables.more(openCount - 1)}
              </Text>
            ) : null}
          </>
        ) : (
          <>
            <View style={styles.dot} />
            <Text style={[text('sm', 'semibold'), { color: colors.success }]}>{strings.tables.free}</Text>
          </>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minHeight: size.tableCard,
    padding: spacing[4],
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow('sm'),
  },
  open: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  freePressed: { backgroundColor: colors.surfaceMuted },
  openPressed: { borderWidth: 2, margin: -1 },
  ready: { backgroundColor: colors.successSoft, borderColor: colors.success, borderWidth: 2, margin: -1 },
  readyPressed: { borderWidth: 3, margin: -2 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { color: colors.textMuted, letterSpacing: 1 },
  seats: { flexDirection: 'row', alignItems: 'center', gap: spacing[1] },
  bottom: {
    marginTop: 'auto',
    paddingTop: spacing[3],
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    flexWrap: 'wrap',
  },
  dot: { width: spacing[2], height: spacing[2], borderRadius: radius.full, backgroundColor: colors.success },
});
