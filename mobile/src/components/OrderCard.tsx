import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import type { OrderStatus, PaymentMethod } from '@shared/constants';
import { Text } from '@/components/Text';
import { formatTime } from '@/lib/format';
import { PAID, READY, SERVED } from '@/lib/names';
import { useLocalName, useT } from '@/lib/i18n';
import { colors, radius, shadow, size, spacing, statusColors, tabularNums, text } from '@/theme';
import { Button } from './Button';
import { Banner } from './Feedback';
import { HighlightRing, useHighlightFade } from './HighlightRing';
import { StatusBadge } from './StatusBadge';

export type OrderCardLine = { id: number; quantity: number; note: string; unitPriceEtb: number; name: string; nameAm: string };

type Props = {
  id: number;
  tableNumber: number;
  status: OrderStatus;
  createdAt: string;
  lines: OrderCardLine[];
  paymentMethod?: PaymentMethod | null;
  /** Ready → "Mark served"; served → "Mark paid". */
  onAction?: () => void;
  actionBusy?: boolean;
  actionError?: string | null;
  /** The order just turned ready live: show the ring, then call onHighlightDone. */
  highlighted?: boolean;
  onHighlightDone?: () => void;
};

const MAX_LINES = 4;

export function orderTotal(lines: OrderCardLine[]): number {
  return lines.reduce((s, l) => s + l.quantity * l.unitPriceEtb, 0);
}

function Ring({ onDone }: { onDone: () => void }) {
  const opacity = useHighlightFade(onDone);
  return <HighlightRing color={colors.success} opacity={opacity} />;
}

export function OrderCard(props: Props) {
  const { id, tableNumber, status, createdAt, lines, paymentMethod, onAction, actionBusy, actionError } = props;
  const strings = useT();
  const localName = useLocalName();
  const m = strings.myOrders;
  const shown = lines.length > MAX_LINES ? lines.slice(0, MAX_LINES - 1) : lines;
  const hidden = lines.length - shown.length;
  const isReady = status === READY;
  const isPaid = status === PAID;
  const action = isReady
    ? { label: m.markServed, icon: 'restaurant-outline' as const }
    : status === SERVED
      ? { label: m.markPaid, icon: 'wallet-outline' as const }
      : null;

  return (
    <View>
      <View style={[styles.card, isReady && styles.ready, isPaid && styles.paid]}>
        {isReady ? (
          <View style={styles.band}>
            <Ionicons name="checkmark-circle" size={size.icon} color={colors.success} />
            <Text style={[text('md', 'bold'), { color: colors.success }]}>{m.pickup}</Text>
          </View>
        ) : null}
        <View style={styles.row}>
          <Text style={[text('lg', 'bold'), { color: colors.text }]}>{strings.common.table(tableNumber)}</Text>
          <StatusBadge status={status} large />
        </View>
        <Text style={[text('sm'), tabularNums, styles.meta]}>{m.orderMeta(id, formatTime(createdAt))}</Text>
        <View style={styles.divider} />
        <View style={styles.lines}>
          {shown.map((l) => (
            <View key={l.id} style={styles.lineRow}>
              <View style={styles.flex}>
                <Text style={[text('md'), { color: colors.text }]}>{strings.common.qtyLine(l.quantity, localName(l.name, l.nameAm))}</Text>
                {l.note ? <Text style={[text('sm'), { color: colors.textMuted }]}>{m.note(l.note)}</Text> : null}
              </View>
              <Text style={[text('md'), tabularNums, { color: colors.textMuted }]}>
                {strings.common.money(l.quantity * l.unitPriceEtb)}
              </Text>
            </View>
          ))}
          {hidden > 0 ? <Text style={[text('sm'), { color: colors.textMuted }]}>{m.moreItems(hidden)}</Text> : null}
        </View>
        <View style={[styles.row, styles.footer]}>
          <Text style={[text('md'), { color: colors.textMuted }]}>{strings.common.total}</Text>
          <Text style={[text('lg', 'bold'), tabularNums, { color: colors.text }]}>{strings.common.money(orderTotal(lines))}</Text>
        </View>
        {isPaid && paymentMethod ? (
          <Text style={[text('sm', 'semibold'), styles.paidLine]}>
            {m.paidWith(strings.paymentMethods[paymentMethod])}
          </Text>
        ) : null}
        {action && onAction ? (
          <View style={styles.actionBox}>
            {actionError ? <Banner body={actionError} style={styles.error} /> : null}
            <Button
              icon={action.icon}
              label={action.label}
              loadingLabel={m.saving}
              loading={actionBusy}
              onPress={onAction}
            />
          </View>
        ) : null}
      </View>
      {props.highlighted && props.onHighlightDone ? <Ring onDone={props.onHighlightDone} /> : null}
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
    overflow: 'hidden',
    ...shadow('sm'),
  },
  ready: { borderWidth: 2, borderColor: colors.success },
  paid: { backgroundColor: colors.surfaceMuted, ...shadow('none') },
  band: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    backgroundColor: colors.successSoft,
    marginTop: -spacing[4],
    marginHorizontal: -spacing[4],
    marginBottom: spacing[3],
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[4],
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing[3] },
  meta: { color: colors.textSubtle, marginTop: spacing[1] },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing[3] },
  lines: { gap: spacing[1] },
  lineRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing[3] },
  flex: { flex: 1 },
  footer: { marginTop: spacing[3] },
  paidLine: { marginTop: spacing[2], color: statusColors.paid.fg },
  actionBox: { marginTop: spacing[4] },
  error: { marginBottom: spacing[3] },
});
