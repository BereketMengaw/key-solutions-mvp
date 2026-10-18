// "EN | አማ" toggle. One tap switches the whole app instantly; the choice is saved on the device.
import { Pressable, StyleSheet, View } from 'react-native';

import { useLanguage, useT } from '@/lib/i18n';
import type { Language } from '@/strings';
import { colors, radius, spacing, text, touch } from '@/theme';
import { Text } from './Text';

const OPTIONS: { value: Language; label: string; font: 'latin' | 'ethiopic' }[] = [
  { value: 'en', label: 'EN', font: 'latin' },
  { value: 'am', label: 'አማ', font: 'ethiopic' },
];

const SLOP = { top: spacing[2], bottom: spacing[2] };
const COMPACT_SLOP = { top: spacing[3], bottom: spacing[3], left: spacing[1], right: spacing[1] };

/** `compact`: slim enough to share a line with small text (home top bar); hit area stays 44pt via hitSlop. */
export function LanguageSwitch({ compact = false }: { compact?: boolean }) {
  const { language, setLanguage } = useLanguage();
  const t = useT();
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={t.language.a11ySwitch}
      style={[styles.group, compact && styles.groupCompact]}
    >
      {OPTIONS.map((o, i) => {
        const on = language === o.value;
        return (
          <View key={o.value} style={styles.item}>
            {i > 0 ? <Text style={[text('sm'), styles.divider]}>|</Text> : null}
            <Pressable
              onPress={() => setLanguage(o.value)}
              accessibilityRole="radio"
              accessibilityLabel={o.value === 'en' ? t.language.a11yEnglish : t.language.a11yAmharic}
              accessibilityState={{ checked: on }}
              hitSlop={compact ? COMPACT_SLOP : SLOP}
              style={({ pressed }) => [
                styles.option,
                compact && styles.optionCompact,
                on && styles.optionOn,
                pressed && !on && styles.optionPressed,
              ]}
            >
              <Text
                style={[
                  text('sm', on ? 'bold' : 'medium'),
                  // Each label always shows in its own script's font, whatever the app language.
                  o.font === 'ethiopic' && { fontFamily: on ? 'NotoSansEthiopic_700Bold' : 'NotoSansEthiopic_500Medium' },
                  { color: on ? colors.text : colors.textMuted },
                ]}
              >
                {o.label}
              </Text>
            </Pressable>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    minHeight: touch.minTarget,
  },
  groupCompact: { minHeight: 0, alignSelf: 'center' },
  item: { flexDirection: 'row', alignItems: 'center' },
  divider: { color: colors.borderStrong, marginHorizontal: spacing[1] },
  option: {
    minHeight: touch.minTarget - spacing[2],
    minWidth: touch.minTarget - spacing[2],
    paddingHorizontal: spacing[2],
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionCompact: { minHeight: spacing[6], minWidth: spacing[8], borderRadius: radius.sm },
  optionOn: { backgroundColor: colors.surfaceMuted },
  optionPressed: { backgroundColor: colors.surfaceMuted },
});
