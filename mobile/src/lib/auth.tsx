import type { Session } from '@supabase/supabase-js';
import type { Href } from 'expo-router';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import type { Role } from '@shared/constants';
import type { Tables } from '@shared/database.types';
import { supabase } from './supabase';

export type Profile = Pick<Tables<'profiles'>, 'full_name' | 'role'>;

export type ProfileResult = { ok: true; profile: Profile | null } | { ok: false };

const WAITER = 'waiter' satisfies Role;

/** Where a signed-in user belongs: waiters get the order screens, everyone else a notice. */
export function homeFor(profile: Profile | null): Href {
  return profile?.role === WAITER ? '/tables' : '/wrong-role';
}

type AuthContextValue = {
  session: Session | null;
  profile: Profile | null;
  email: string;
  /** Reads the signed-in user's profile. `ok: false` means the request failed (network). */
  loadProfile: (session: Session) => Promise<ProfileResult>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      if (!next) setProfile(null);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const loadProfile = useCallback(async (s: Session): Promise<ProfileResult> => {
    setSession(s);
    const { data, error } = await supabase
      .from('profiles')
      .select('full_name, role')
      .eq('id', s.user.id)
      .maybeSingle();
    if (error) return { ok: false };
    setProfile(data);
    return { ok: true, profile: data };
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    // Offline: the server call fails, so clear the session on this phone anyway.
    if (error) await supabase.auth.signOut({ scope: 'local' });
    setSession(null);
    setProfile(null);
  }, []);

  const value = useMemo(
    () => ({ session, profile, email: session?.user.email ?? '', loadProfile, signOut }),
    [session, profile, loadProfile, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
