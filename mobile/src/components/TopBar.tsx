import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { strings } from '@/strings';
import { colors, spacing, text, touch } from '@/theme';
import { IconButton } from './IconButton';

/** Home layout (Tables, My orders): eyebrow + big title, optional action on the right. */
export function TopBarHome({ eyebrow, title, right }: { eyebrow: string; title: string; right?: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.home, { paddingTop: insets.top + spacing[3] }]}>
      <View style={styles.flex}>
        <Text style={[text('sm', 'medium'), { color: colors.textMuted }]}>{eyebrow}</Text>
        <Text numberOfLines={1} style={[text('2xl', 'bold'), { color: colors.text }]}>
          {title}
        </Text>
      </View>
      {right}
    </View>
  );
}

type StackProps = {
  title: string;
  subtitle?: string;
  onBack: () => void;
  backDisabled?: boolean;
  right?: ReactNode;
};

/** Stack layout (Menu, Cart): back button, title + subtitle, optional action. */
export function TopBarStack({ title, subtitle, onBack, backDisabled, right }: StackProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.stack, { paddingTop: insets.top + spacing[3] }]}>
      <IconButton
        icon="chevron-back"
        accessibilityLabel={strings.common.back}
        onPress={onBack}
        disabled={backDisabled}
      />
      <View style={[styles.flex, styles.stackTitle]}>
        <Text numberOfLines={1} style={[text('xl', 'bold'), { color: colors.text }]}>
          {title}
        </Text>
        {subtitle ? (
          <Text numberOfLines={1} style={[text('sm'), { color: colors.textMuted }]}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  home: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingBottom: spacing[3],
    paddingHorizontal: spacing[4],
    backgroundColor: colors.background,
    gap: spacing[3],
  },
  stack: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: touch.minTarget + spacing[3] * 2,
    paddingBottom: spacing[3],
    paddingLeft: spacing[2],
    paddingRight: spacing[4],
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  stackTitle: { marginLeft: spacing[1] },
});
