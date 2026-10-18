import { StyleSheet, Text, View } from 'react-native';

import type { OrderStatus } from '@shared/constants';
import { formatEtb, formatTime } from '@/lib/format';
import { strings } from '@/strings';
import { colors, radius, shadow, spacing, tabularNums, text } from '@/theme';
import { StatusBadge } from './StatusBadge';

export type OrderCardLine = { id: number; quantity: number; note: string; unitPriceEtb: number; name: string };

type Props = {
  id: number;
  tableNumber: number;
  status: OrderStatus;
  createdAt: string;
  lines: OrderCardLine[];
};

const MAX_LINES = 4;

export function OrderCard({ id, tableNumber, status, createdAt, lines }: Props) {
  const shown = lines.length > MAX_LINES ? lines.slice(0, MAX_LINES - 1) : lines;
  const hidden = lines.length - shown.length;
  const total = lines.reduce((s, l) => s + l.quantity * l.unitPriceEtb, 0);
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Text style={[text('lg', 'bold'), { color: colors.text }]}>{strings.common.table(tableNumber)}</Text>
        <StatusBadge status={status} large />
      </View>
      <Text style={[text('sm'), tabularNums, styles.meta]}>
        {strings.myOrders.orderMeta(id, formatTime(createdAt))}
      </Text>
      <View style={styles.divider} />
      <View style={styles.lines}>
        {shown.map((l) => (
          <View key={l.id} style={styles.lineRow}>
            <View style={styles.flex}>
              <Text style={[text('md'), { color: colors.text }]}>{strings.common.qtyLine(l.quantity, l.name)}</Text>
              {l.note ? (
                <Text style={[text('sm'), { color: colors.textMuted }]}>{strings.myOrders.note(l.note)}</Text>
              ) : null}
            </View>
            <Text style={[text('md'), tabularNums, { color: colors.textMuted }]}>
              {formatEtb(l.quantity * l.unitPriceEtb)}
            </Text>
          </View>
        ))}
        {hidden > 0 ? (
          <Text style={[text('sm'), { color: colors.textMuted }]}>{strings.myOrders.moreItems(hidden)}</Text>
        ) : null}
      </View>
      <View style={[styles.row, styles.footer]}>
        <Text style={[text('md'), { color: colors.textMuted }]}>{strings.common.total}</Text>
        <Text style={[text('lg', 'bold'), tabularNums, { color: colors.text }]}>{formatEtb(total)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing[4],
    ...shadow('sm'),
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing[3] },
  meta: { color: colors.textSubtle, marginTop: spacing[1] },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing[3] },
  lines: { gap: spacing[1] },
  lineRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing[3] },
  flex: { flex: 1 },
  footer: { marginTop: spacing[3] },
});
