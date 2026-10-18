// Startup: read the saved session, load the profile, send the user to the right screen.
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { BrandMark } from '@/components/BrandMark';
import { Button } from '@/components/Button';
import { homeFor, useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { strings } from '@/strings';
import { colors, spacing, text } from '@/theme';

export default function Startup() {
  const { loadProfile, signOut } = useAuth();
  const [failed, setFailed] = useState(false);
  const [checking, setChecking] = useState(true);

  const check = useCallback(
    () =>
      supabase.auth
        .getSession()
        .then(({ data }) => (data.session ? loadProfile(data.session) : null))
        .then((result) => {
          if (result === null) router.replace('/login');
          else if (result.ok) router.replace(homeFor(result.profile));
          else {
            setFailed(true);
            setChecking(false);
          }
        }),
    [loadProfile],
  );

  useEffect(() => {
    check();
  }, [check]);

  const onSignOut = async () => {
    await signOut();
    router.replace('/login');
  };

  return (
    <View style={styles.screen}>
      <BrandMark />
      <Text style={[text('2xl', 'bold'), styles.wordmark]}>{strings.common.appName}</Text>
      {failed ? (
        <View style={styles.error}>
          <Text style={[text('md', 'semibold'), { color: colors.text }]}>{strings.common.cantReachServer}</Text>
          <Text style={[text('sm'), styles.errorBody]}>{strings.common.checkConnection}</Text>
          <Button
            variant="secondary"
            label={strings.common.tryAgain}
            onPress={() => {
              setChecking(true);
              setFailed(false);
              check();
            }}
            loading={checking}
            fullWidth={false}
            style={styles.retry}
          />
          <Button variant="ghost" label={strings.startup.signOut} onPress={onSignOut} fullWidth={false} />
        </View>
      ) : (
        <ActivityIndicator size="small" color={colors.primary} style={styles.spinner} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    paddingHorizontal: spacing[4],
  },
  wordmark: { marginTop: spacing[4], color: colors.text },
  spinner: { marginTop: spacing[8] },
  error: { marginTop: spacing[8], alignItems: 'center' },
  errorBody: { marginTop: spacing[1], color: colors.textMuted, textAlign: 'center' },
  retry: { marginTop: spacing[4] },
});
