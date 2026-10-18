import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/Text';
import { useT } from '@/lib/i18n';
import { colors, lineHeight, radius, shadow, size, spacing, tabularNums, text, touch } from '@/theme';
import { ItemTile } from './ItemTile';
import { QuantityStepper } from './QuantityStepper';

type Props = {
  name: string;
  priceEtb: number;
  categorySortOrder: number;
  quantity: number;
  onAdd: () => void;
  onIncrement: () => void;
  onDecrement: () => void;
};

export function MenuItemCard({ name, priceEtb, categorySortOrder, quantity, onAdd, onIncrement, onDecrement }: Props) {
  const strings = useT();
  const selected = quantity > 0;
  const price = strings.common.money(priceEtb);
  const content = (pressed: boolean) => (
    <>
      <View>
        <ItemTile name={name} categorySortOrder={categorySortOrder} variant="card" />
        {selected ? (
          <View style={styles.countPill}>
            <Text style={[text('xs', 'bold'), tabularNums, { color: colors.textOnPrimary }]}>{quantity}</Text>
          </View>
        ) : null}
      </View>
      <View style={styles.body}>
        <Text numberOfLines={2} style={[text('md', 'semibold'), styles.name]}>
          {name}
        </Text>
        <Text style={[text('md', 'bold'), tabularNums, styles.price]}>{price}</Text>
        <View style={styles.action}>
          {selected ? (
            <QuantityStepper item={name} quantity={quantity} onIncrement={onIncrement} onDecrement={onDecrement} spread />
          ) : (
            <View style={[styles.addPill, pressed && { backgroundColor: colors.primary }]}>
              <Ionicons name="add" size={size.icon} color={pressed ? colors.textOnPrimary : colors.primary} />
              <Text style={[text('md', 'semibold'), { color: pressed ? colors.textOnPrimary : colors.primary }]}>
                {strings.menu.add}
              </Text>
            </View>
          )}
        </View>
      </View>
    </>
  );

  // In the order: only the stepper reacts, so a stray tap on the card can't add another.
  if (selected) {
    return (
      <View
        accessibilityLabel={strings.menu.a11yItem(name, price) + strings.menu.a11yInOrder(quantity)}
        style={[styles.card, styles.selected]}
      >
        {content(false)}
      </View>
    );
  }

  // Not in the order yet: the whole card adds one.
  return (
    <Pressable
      onPress={onAdd}
      accessibilityRole="button"
      accessibilityLabel={strings.menu.a11yItem(name, price)}
      accessibilityHint={strings.menu.a11yAddHint}
      style={({ pressed }) => [styles.card, pressed && { backgroundColor: colors.surfaceMuted }]}
    >
      {({ pressed }) => content(pressed)}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    ...shadow('sm'),
  },
  selected: { borderWidth: 2, borderColor: colors.primary, margin: -1 },
  countPill: {
    position: 'absolute',
    top: spacing[2],
    right: spacing[2],
    minWidth: spacing[6],
    height: spacing[6],
    paddingHorizontal: spacing[1],
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { padding: spacing[3] },
  name: { color: colors.text, minHeight: lineHeight.md * 2 },
  price: { color: colors.primary, marginTop: spacing[1] },
  action: { marginTop: spacing[3], height: touch.minTarget },
  addPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[1],
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
  },
});
