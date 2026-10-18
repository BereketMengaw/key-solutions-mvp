import { isAuthApiError } from '@supabase/supabase-js';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  BackHandler,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type TextInputInstance,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/Text';
import { BrandMark } from '@/components/BrandMark';
import { LanguageSwitch } from '@/components/LanguageSwitch';
import { Button } from '@/components/Button';
import { Banner } from '@/components/Feedback';
import { TextField } from '@/components/TextField';
import { homeFor, useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { useT } from '@/lib/i18n';
import { colors, radius, shadow, spacing, text } from '@/theme';

type FormError = 'wrong' | 'network' | 'tooMany';


/** Maps a sign-in failure to one of our messages. Raw Supabase text is never shown. */
function classify(error: unknown): FormError {
  if (isAuthApiError(error)) {
    if (error.status === 429) return 'tooMany';
    if (error.status >= 400 && error.status < 500) return 'wrong';
  }
  return 'network';
}

export default function Login() {
  const strings = useT();
  const s = strings.login;
  const bannerCopy: Record<FormError, { title: string; body: string }> = {
    wrong: { title: s.wrongTitle, body: s.wrongBody },
    network: { title: strings.common.cantReachServer, body: strings.common.checkConnection },
    tooMany: { title: s.tooManyTitle, body: s.tooManyBody },
  };
  const insets = useSafeAreaInsets();
  const { loadProfile } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState<string>();
  const [passwordError, setPasswordError] = useState<string>();
  const [formError, setFormError] = useState<FormError | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const emailRef = useRef<TextInputInstance>(null);
  const passwordRef = useRef<TextInputInstance>(null);

  // Hardware back does nothing while signing in.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => submitting);
    return () => sub.remove();
  }, [submitting]);

  const submit = async () => {
    if (submitting) return;
    const trimmed = email.trim();
    const eErr = !trimmed ? s.emailEmpty : !trimmed.includes('@') ? s.emailInvalid : undefined;
    const pErr = !password ? s.passwordEmpty : undefined;
    setEmailError(eErr);
    setPasswordError(pErr);
    if (eErr || pErr) {
      (eErr ? emailRef : passwordRef).current?.focus();
      return;
    }

    Keyboard.dismiss();
    setFormError(null);
    setSubmitting(true);

    const { data, error } = await supabase.auth.signInWithPassword({ email: trimmed, password });
    if (error || !data.session) {
      const kind = classify(error);
      setFormError(kind);
      setSubmitting(false);
      if (kind === 'wrong') {
        setPassword('');
        passwordRef.current?.focus();
      }
      return;
    }

    const result = await loadProfile(data.session);
    if (!result.ok) {
      setFormError('network');
      setSubmitting(false);
      return;
    }
    // Stay in the loading state until the next screen replaces this one.
    router.replace(homeFor(result.profile));
  };

  const onEmail = (v: string) => {
    setEmail(v);
    setEmailError(undefined);
    setFormError(null);
  };
  const onPassword = (v: string) => {
    setPassword(v);
    setPasswordError(undefined);
    setFormError(null);
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={[styles.language, { top: insets.top + spacing[2], right: spacing[4] }]}>
        <LanguageSwitch />
      </View>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing[4] }]}
      >
        <View style={[styles.brand, { paddingTop: insets.top + spacing[12] }]}>
          <BrandMark />
          <Text style={[text('3xl', 'bold'), styles.wordmark]}>{strings.common.appName}</Text>
          <Text style={[text('md'), styles.tagline]}>{s.tagline}</Text>
        </View>

        <View style={styles.card}>
          <Text accessibilityRole="header" style={[text('xl', 'bold'), { color: colors.text }]}>
            {s.heading}
          </Text>
          <Text style={[text('sm'), styles.subheading]}>{s.subheading}</Text>

          {formError ? (
            <View style={styles.banner}>
              <Banner title={bannerCopy[formError].title} body={bannerCopy[formError].body} />
            </View>
          ) : null}

          <View style={[styles.fields, formError && styles.fieldsAfterBanner]}>
            <TextField
              ref={emailRef}
              label={s.emailLabel}
              placeholder={s.emailPlaceholder}
              value={email}
              onChangeText={onEmail}
              error={emailError}
              disabled={submitting}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              textContentType="emailAddress"
              returnKeyType="next"
              submitBehavior="submit"
              onSubmitEditing={() => passwordRef.current?.focus()}
            />
            <TextField
              ref={passwordRef}
              label={s.passwordLabel}
              value={password}
              onChangeText={onPassword}
              error={passwordError}
              disabled={submitting}
              password
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="password"
              textContentType="password"
              returnKeyType="go"
              onSubmitEditing={submit}
            />
          </View>

          <Button
            label={s.submit}
            loadingLabel={s.submitting}
            loading={submitting}
            onPress={submit}
            style={styles.submit}
          />
        </View>

        <Text style={[text('xs'), styles.footer]}>{s.footer}</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1, paddingHorizontal: spacing[4] },
  language: { position: 'absolute', zIndex: 1 },
  brand: { flex: 1, justifyContent: 'flex-end' },
  wordmark: { marginTop: spacing[6], color: colors.text },
  tagline: { marginTop: spacing[2], color: colors.textMuted },
  card: {
    marginTop: spacing[8],
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing[5],
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow('md'),
  },
  subheading: { marginTop: spacing[1], color: colors.textMuted },
  banner: { marginTop: spacing[5] },
  fields: { marginTop: spacing[5], gap: spacing[4] },
  fieldsAfterBanner: { marginTop: spacing[4] },
  submit: { marginTop: spacing[6] },
  footer: { marginTop: spacing[6], color: colors.textSubtle, textAlign: 'center' },
});
