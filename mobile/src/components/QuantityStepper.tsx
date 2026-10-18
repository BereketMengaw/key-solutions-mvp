import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { MAX_QUANTITY } from '@/lib/draft';
import { strings } from '@/strings';
import { colors, radius, size, spacing, tabularNums, text, touch } from '@/theme';

type Props = {
  item: string;
  quantity: number;
  onIncrement: () => void;
  onDecrement: () => void;
  disabled?: boolean;
  spread?: boolean;
};

export function QuantityStepper({ item, quantity, onIncrement, onDecrement, disabled, spread }: Props) {
  const atOne = quantity <= 1;
  const atMax = quantity >= MAX_QUANTITY;
  const plusDisabled = disabled || atMax;
  return (
    <View style={[styles.row, spread && styles.spread]}>
      <Pressable
        onPress={onDecrement}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={atOne ? strings.menu.a11yRemove(item) : strings.menu.a11yRemoveOne(item)}
        accessibilityState={{ disabled }}
        style={({ pressed }) => [
          styles.button,
          styles.minus,
          pressed && { backgroundColor: colors.surfaceMuted },
          disabled && styles.disabled,
        ]}
      >
        <Ionicons
          name={atOne ? 'trash-outline' : 'remove'}
          size={size.iconLg}
          color={disabled ? colors.textSubtle : atOne ? colors.danger : colors.text}
        />
      </Pressable>
      <Text accessibilityLiveRegion="polite" style={[text('lg', 'bold'), tabularNums, styles.count]}>
        {quantity}
      </Text>
      <Pressable
        onPress={onIncrement}
        disabled={plusDisabled}
        accessibilityRole="button"
        accessibilityLabel={strings.menu.a11yAddOne(item)}
        accessibilityState={{ disabled: plusDisabled }}
        style={({ pressed }) => [
          styles.button,
          { backgroundColor: pressed ? colors.primaryPressed : colors.primary },
          plusDisabled && styles.disabled,
        ]}
      >
        <Ionicons
          name="add"
          size={size.iconLg}
          color={plusDisabled ? colors.textSubtle : colors.textOnPrimary}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', height: touch.minTarget },
  spread: { alignSelf: 'stretch', justifyContent: 'space-between' },
  button: {
    width: touch.minTarget,
    height: touch.minTarget,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  minus: { backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.borderControl },
  disabled: { backgroundColor: colors.surfaceMuted, borderWidth: 1.5, borderColor: colors.border },
  count: { minWidth: spacing[10], textAlign: 'center', color: colors.text },
});
