import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/Text';
import { useT } from '@/lib/i18n';
import { colors, radius, shadow, size, spacing, text } from '@/theme';

/** The "K" key mark. Views and Text only, no image asset. */
export function BrandMark() {
  const strings = useT();
  return (
    <View accessible accessibilityLabel={strings.common.appName} style={styles.mark}>
      <Text style={[text('3xl', 'bold'), { color: colors.textOnPrimary }]}>K</Text>
      <View style={styles.bit} />
    </View>
  );
}

const styles = StyleSheet.create({
  mark: {
    width: size.brandMark,
    height: size.brandMark,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow('md'),
  },
  bit: {
    position: 'absolute',
    width: spacing[3],
    height: spacing[3],
    right: spacing[2],
    bottom: spacing[2],
    borderRadius: radius.full,
    backgroundColor: colors.primarySoft,
  },
});
