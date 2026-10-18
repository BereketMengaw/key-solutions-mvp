import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { BackHandler, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Role } from '@shared/constants';
import { Button, type IconName } from '@/components/Button';
import { useAuth } from '@/lib/auth';
import { useDraft } from '@/lib/draft';
import { initials } from '@/lib/format';
import { strings } from '@/strings';
import { colors, radius, size, spacing, text } from '@/theme';

const s = strings.wrongRole;

type Variant = { icon: IconName; title: string; body: string };

const kitchen: Variant = { icon: 'flame-outline', title: s.kitchenTitle, body: s.kitchenBody };
const website: Variant = { icon: 'stats-chart-outline', title: s.websiteTitle, body: s.websiteBody };
const noRole: Variant = { icon: 'person-circle-outline', title: s.noRoleTitle, body: s.noRoleBody };

// Waiters and cooks have their own screens; if one somehow lands here, these are the safe choices.
const variantByRole: Record<Role, Variant> = { cook: kitchen, manager: website, owner: website, waiter: noRole };

export default function WrongRole() {
  const insets = useSafeAreaInsets();
  const { profile, email, signOut } = useAuth();
  const { clear } = useDraft();
  const [signingOut, setSigningOut] = useState(false);

  // Nowhere to go back to.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, []);

  // A profile whose role was removed (role = null) gets the "not set up" notice.
  const variant = profile?.role ? variantByRole[profile.role] : noRole;
  const name = profile?.full_name.trim() ?? '';

  const onSignOut = async () => {
    setSigningOut(true);
    clear();
    await signOut();
    router.replace('/login');
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top + spacing[4], paddingBottom: insets.bottom + spacing[4] }]}>
      <View style={styles.who}>
        <View style={styles.avatar}>
          {name ? (
            <Text style={[text('md', 'bold'), { color: colors.textMuted }]}>{initials(name)}</Text>
          ) : (
            <Ionicons name="person-outline" size={size.iconLg} color={colors.textMuted} />
          )}
        </View>
        <View style={styles.flex}>
          <Text numberOfLines={1} style={[text('md', 'semibold'), { color: colors.text }]}>
            {name || email}
          </Text>
          {profile?.role ? (
            <Text style={[text('sm'), { color: colors.textMuted }]}>{strings.roles[profile.role]}</Text>
          ) : null}
        </View>
      </View>

      <View style={styles.message}>
        <View style={styles.circle}>
          <Ionicons name={variant.icon} size={size.iconXl} color={colors.primary} />
        </View>
        <Text accessibilityRole="header" style={[text('2xl', 'bold'), styles.title]}>
          {variant.title}
        </Text>
        <Text style={[text('md'), styles.body]}>{variant.body}</Text>
      </View>

      <Button
        icon="log-out-outline"
        label={strings.common.signOut}
        loadingLabel={strings.common.signingOut}
        loading={signingOut}
        onPress={onSignOut}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background, paddingHorizontal: spacing[4] },
  who: { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  avatar: {
    width: size.tileSm,
    height: size.tileSm,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flex: { flex: 1 },
  message: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  circle: {
    width: size.heroCircle,
    height: size.heroCircle,
    borderRadius: radius.full,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { marginTop: spacing[5], color: colors.text, textAlign: 'center' },
  body: { marginTop: spacing[3], color: colors.textMuted, textAlign: 'center', maxWidth: size.textBlock },
});
