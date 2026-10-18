import 'server-only';

import { cache } from 'react';
import type { Role } from '@shared/constants';
import { isWebRole } from '@/lib/roles';
import { createSupabaseServer } from '@/lib/supabase/server';

export type Viewer =
  | { kind: 'signed-out' }
  /** Signed in, but the profile read failed (network / server). */
  | { kind: 'error'; userId: string; email: string }
  | { kind: 'ok'; userId: string; email: string; fullName: string; role: Role | null };

/** The signed-in user and their profile, read once per request on the server. */
export const getViewer = cache(async (): Promise<Viewer> => {
  const supabase = await createSupabaseServer();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const claims = claimsData?.claims;
  if (claimsError || !claims?.sub) return { kind: 'signed-out' };

  const userId = claims.sub;
  const email = typeof claims.email === 'string' ? claims.email : '';
  const { data, error } = await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('id', userId)
    .maybeSingle();
  if (error) return { kind: 'error', userId, email };
  return { kind: 'ok', userId, email, fullName: data?.full_name ?? '', role: data?.role ?? null };
});

/** Where a signed-in user belongs. */
export function homeFor(role: Role | null | undefined): '/dashboard' | '/wrong-role' {
  return isWebRole(role) ? '/dashboard' : '/wrong-role';
}
