'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button, type ButtonProps } from '@/components/ui';
import { markSigningOut } from '@/lib/session';
import { useStrings } from '@/components/LangProvider';
import { getSupabase } from '@/lib/supabase/client';

/** No confirmation. If the server call fails, the local session is cleared anyway. */
export function SignOutButton(props: Omit<ButtonProps, 'onClick' | 'loading' | 'loadingLabel' | 'children'>) {
  const router = useRouter();
  const s = useStrings();
  const [busy, setBusy] = useState(false);
  async function signOut() {
    setBusy(true);
    markSigningOut();
    const supabase = getSupabase();
    const { error } = await supabase.auth.signOut();
    if (error) await supabase.auth.signOut({ scope: 'local' });
    router.replace('/login');
    router.refresh();
  }
  return (
    <Button icon="log-out-outline" {...props} loading={busy} loadingLabel={s.nav.signingOut} onClick={signOut}>
      {s.nav.signOut}
    </Button>
  );
}
