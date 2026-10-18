import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet } from 'react-native';

import { colors, radius, size, touch } from '@/theme';
import type { IconName } from './Button';

type Props = {
  icon: IconName;
  accessibilityLabel: string;
  onPress: () => void;
  color?: string;
  disabled?: boolean;
};

export function IconButton({ icon, accessibilityLabel, onPress, color = colors.text, disabled }: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [styles.base, pressed && styles.pressed]}
    >
      <Ionicons name={icon} size={size.iconLg} color={disabled ? colors.textSubtle : color} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    width: touch.minTarget,
    height: touch.minTarget,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { backgroundColor: colors.surfaceMuted },
});
