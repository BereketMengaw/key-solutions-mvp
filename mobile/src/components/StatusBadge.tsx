import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import type { OrderStatus } from '@shared/constants';
import { strings } from '@/strings';
import { radius, size, spacing, statusColors, text } from '@/theme';
import type { IconName } from './Button';

const icons: Record<OrderStatus, IconName> = {
  sent: 'paper-plane-outline',
  preparing: 'flame-outline',
  ready: 'checkmark-circle-outline',
  served: 'restaurant-outline',
  paid: 'wallet-outline',
};

/** Status pill: always icon + label + color, never color alone. */
export function StatusBadge({ status, large = false }: { status: OrderStatus; large?: boolean }) {
  const c = statusColors[status];
  const label = strings.status[status];
  return (
    <View
      accessible
      accessibilityLabel={strings.statusA11y(label)}
      style={[styles.pill, { backgroundColor: c.bg }]}
    >
      <Ionicons name={icons[status]} size={large ? size.icon : size.iconSm} color={c.fg} />
      <Text style={[large ? text('md', 'semibold') : text('sm', 'semibold'), { color: c.fg }]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing[1],
    paddingVertical: spacing[1],
    paddingHorizontal: spacing[3],
    borderRadius: radius.full,
  },
});
