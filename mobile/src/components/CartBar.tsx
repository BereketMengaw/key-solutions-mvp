import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Animated, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/Text';
import { useT } from '@/lib/i18n';
import { colors, radius, shadow, size, spacing, tabularNums, text, touch } from '@/theme';

type Props = { count: number; total: number; onPress: () => void };

/** Floating "Review order" bar. Slides in with the first item, out when the order is emptied. */
export function CartBar({ count, total, onPress }: Props) {
  const strings = useT();
  const insets = useSafeAreaInsets();
  const visible = count > 0;
  const [rendered, setRendered] = useState(visible);
  const [progress] = useState(() => new Animated.Value(visible ? 1 : 0));
  // Mount as soon as there is something to show; unmount only after the exit animation.
  if (visible && !rendered) setRendered(true);

  useEffect(() => {
    const anim = Animated.timing(progress, {
      toValue: visible ? 1 : 0,
      duration: 150,
      useNativeDriver: Platform.OS !== 'web',
    });
    anim.start(({ finished }) => {
      if (finished && !visible) setRendered(false);
    });
    return () => anim.stop();
  }, [visible, progress]);

  if (!rendered) return null;

  const countLabel = strings.common.itemCount(count);
  const totalLabel = strings.common.money(total);

  return (
    <Animated.View
      style={[
        styles.wrap,
        { bottom: insets.bottom + spacing[3] },
        {
          opacity: progress,
          transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [spacing[4], 0] }) }],
        },
      ]}
    >
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={strings.menu.a11yCartBar(countLabel, totalLabel)}
        style={({ pressed }) => [styles.bar, pressed && { backgroundColor: colors.primaryPressed }]}
      >
        {({ pressed }) => (
          <>
            <View style={[styles.bubble, pressed && { backgroundColor: colors.primary }]}>
              <Text style={[text('sm', 'bold'), tabularNums, styles.onPrimary]}>{count}</Text>
            </View>
            <Text style={[text('lg', 'semibold'), styles.onPrimary, styles.label]}>{strings.menu.reviewOrder}</Text>
            <Text style={[text('lg', 'bold'), tabularNums, styles.onPrimary]}>{totalLabel}</Text>
            <Ionicons name="chevron-forward" size={size.icon} color={colors.textOnPrimary} />
          </>
        )}
      </Pressable>
    </Animated.View>
  );
}

/** Space the list must leave at the bottom so its last cards scroll above the bar. */
export const CART_BAR_SPACE = touch.primaryAction + spacing[3] * 2;

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: spacing[4], right: spacing[4] },
  bar: {
    height: touch.primaryAction,
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingHorizontal: spacing[4],
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    ...shadow('lg'),
  },
  bubble: {
    minWidth: spacing[8],
    height: spacing[8],
    paddingHorizontal: spacing[2],
    borderRadius: radius.full,
    backgroundColor: colors.primaryPressed,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing[2],
  },
  label: { flex: 1 },
  onPrimary: { color: colors.textOnPrimary },
});
