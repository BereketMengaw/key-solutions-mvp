'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState, type FormEvent } from 'react';
import { Icon } from '@/components/icons';
import { Banner, Button, FieldError, cx, fieldBox } from '@/components/ui';
import { isWebRole } from '@/lib/roles';
import { safeNext } from '@/lib/safe-next';
import { useStrings } from '@/components/LangProvider';
import type { Strings } from '@/lib/strings';
import { getSupabase } from '@/lib/supabase/client';

// Banner and field errors are kept as keys, so switching language re-words them in place.
type BannerKind = 'expired' | 'tooMany' | 'badCredentials' | 'network';
type ErrorKey = 'emailEmpty' | 'emailInvalid' | 'passwordEmpty';
type Errors = { email?: ErrorKey; password?: ErrorKey };

function bannerFor(kind: BannerKind, s: Strings) {
  const l = s.login;
  if (kind === 'expired') return { tone: 'info' as const, title: l.expiredTitle, body: l.expiredBody };
  if (kind === 'tooMany') return { tone: 'error' as const, title: l.tooManyTitle, body: l.tooManyBody };
  if (kind === 'badCredentials') return { tone: 'error' as const, title: l.badCredentialsTitle, body: l.badCredentialsBody };
  return { tone: 'error' as const, title: l.networkTitle, body: l.networkBody };
}

const TIMEOUT_MS = 15_000;

function withTimeout<T>(p: Promise<T>): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('timeout')), TIMEOUT_MS)),
  ]);
}

export function LoginForm({ next, expired }: { next: string | null; expired: boolean }) {
  const router = useRouter();
  const s = useStrings();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [bannerKind, setBanner] = useState<BannerKind | null>(expired ? 'expired' : null);
  const banner = bannerKind ? bannerFor(bannerKind, s) : null;
  const [busy, setBusy] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  const edit = (field: keyof Errors, value: string) => {
    if (field === 'email') setEmail(value);
    else setPassword(value);
    setBanner(null);
    if (errors[field]) setErrors((e) => ({ ...e, [field]: undefined }));
  };

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    const trimmed = email.trim();
    const found: Errors = {};
    if (!trimmed) found.email = 'emailEmpty';
    else if (!trimmed.includes('@')) found.email = 'emailInvalid';
    if (!password) found.password = 'passwordEmpty';
    setErrors(found);
    if (found.email || found.password) {
      (found.email ? emailRef : passwordRef).current?.focus();
      return;
    }

    setBusy(true);
    setBanner(null);
    const supabase = getSupabase();
    try {
      const { data, error } = await withTimeout(
        supabase.auth.signInWithPassword({ email: trimmed, password }),
      );
      if (error) {
        setBusy(false);
        if (error.status === 429) {
          setBanner('tooMany');
        } else if (error.status === 400 || error.code === 'invalid_credentials') {
          setBanner('badCredentials');
          setPassword('');
          passwordRef.current?.focus();
        } else {
          setBanner('network');
        }
        return;
      }
      const { data: profile } = await withTimeout(
        Promise.resolve(
          supabase.from('profiles').select('role').eq('id', data.user.id).maybeSingle(),
        ),
      );
      // Stay in "Signing in…" through the redirect: no flash back to the form.
      router.replace(isWebRole(profile?.role) ? (safeNext(next) ?? '/dashboard') : '/wrong-role');
      router.refresh();
    } catch {
      setBusy(false);
      setBanner('network');
    }
  }

  const emailErrId = 'email-error';
  const pwErrId = 'password-error';

  return (
    <form
      noValidate
      onSubmit={onSubmit}
      className="w-full bg-surface border border-border rounded-xl shadow-md p-6 md:p-8"
    >
      <h1 className="text-2xl font-bold">{s.login.title}</h1>
      <p className="mt-1 text-sm text-text-muted">{s.login.subtitle}</p>

      <div className="mt-6">
        {banner && <Banner tone={banner.tone} title={banner.title} body={banner.body} className="mb-4" />}

        <label htmlFor="email" className="block text-sm font-semibold text-text mb-2">
          {s.login.email}
        </label>
        <input
          ref={emailRef}
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          autoFocus
          placeholder={s.login.emailPlaceholder}
          value={email}
          disabled={busy}
          onChange={(e) => edit('email', e.target.value)}
          aria-invalid={errors.email ? true : undefined}
          aria-describedby={errors.email ? emailErrId : undefined}
          className={fieldBox(!!errors.email)}
        />
        {errors.email && <FieldError id={emailErrId} message={s.login[errors.email]} />}

        <label htmlFor="password" className="mt-4 block text-sm font-semibold text-text mb-2">
          {s.login.password}
        </label>
        <div className="relative">
          <input
            ref={passwordRef}
            id="password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            value={password}
            disabled={busy}
            onChange={(e) => edit('password', e.target.value)}
            aria-invalid={errors.password ? true : undefined}
            aria-describedby={errors.password ? pwErrId : undefined}
            className={fieldBox(!!errors.password, 'pr-14')}
          />
          <button
            type="button"
            disabled={busy}
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? s.login.hidePassword : s.login.showPassword}
            aria-pressed={showPassword}
            className={cx(
              'absolute right-0 top-0 size-12 grid place-items-center rounded-md text-text-muted hover:text-text',
              'disabled:cursor-not-allowed',
            )}
          >
            <Icon name={showPassword ? 'eye-off-outline' : 'eye-outline'} className="size-icon" />
          </button>
        </div>
        {errors.password && <FieldError id={pwErrId} message={s.login[errors.password]} />}

        <Button
          type="submit"
          size="lg"
          fullWidth
          loading={busy}
          loadingLabel={s.login.submitting}
          className="mt-6"
        >
          {s.login.submit}
        </Button>
      </div>
    </form>
  );
}
