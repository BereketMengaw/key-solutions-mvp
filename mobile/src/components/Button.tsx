import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import { Text } from '@/components/Text';
import { colors, radius, shadow, size, spacing, text, touch } from '@/theme';

export type IconName = React.ComponentProps<typeof Ionicons>['name'];

type Variant = 'primary' | 'secondary' | 'ghost';

type Props = {
  label: string;
  onPress: () => void;
  variant?: Variant;
  icon?: IconName;
  loading?: boolean;
  loadingLabel?: string;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
  accessibilityLabel?: string;
};

const variants = {
  primary: { bg: colors.primary, pressed: colors.primaryPressed, label: colors.textOnPrimary },
  secondary: { bg: colors.surface, pressed: colors.surfaceMuted, label: colors.text },
  ghost: { bg: 'transparent', pressed: colors.primarySoft, label: colors.primary },
} as const;

export function Button({
  label,
  onPress,
  variant = 'primary',
  icon,
  loading = false,
  loadingLabel,
  disabled = false,
  fullWidth = variant === 'primary',
  style,
  accessibilityLabel,
}: Props) {
  const v = variants[variant];
  const inactive = disabled && !loading;
  const labelColor = inactive ? colors.textSubtle : v.label;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      style={({ pressed }) => [
        styles.base,
        variant === 'primary' ? styles.primary : styles.small,
        variant === 'secondary' && styles.secondary,
        { backgroundColor: pressed ? v.pressed : v.bg },
        variant === 'primary' ? shadow('md') : shadow('none'),
        fullWidth ? styles.full : styles.hug,
        inactive && styles.disabled,
        style,
      ]}
    >
      <View style={styles.row}>
        {loading ? (
          <ActivityIndicator size="small" color={labelColor} />
        ) : icon ? (
          <Ionicons name={icon} size={size.icon} color={labelColor} />
        ) : null}
        <Text
          style={[
            variant === 'primary' ? text('lg', 'semibold') : text('md', 'semibold'),
            { color: labelColor },
          ]}
        >
          {loading ? (loadingLabel ?? label) : label}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing[5],
  },
  primary: { minHeight: touch.primaryAction, borderRadius: radius.lg },
  small: { minHeight: touch.minTarget, borderRadius: radius.md },
  secondary: { borderRadius: radius.lg, borderWidth: 1.5, borderColor: colors.borderControl },
  full: { alignSelf: 'stretch' },
  hug: { alignSelf: 'auto' },
  disabled: {
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1.5,
    borderColor: colors.border,
    ...shadow('none'),
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
});
