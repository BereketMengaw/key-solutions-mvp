import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Icon, type IconName } from '@/components/icons';
import { LangSwitch } from '@/components/LangSwitch';
import { SignOutButton } from '@/components/SignOutButton';
import { Avatar, BrandMark } from '@/components/ui';
import { getViewer } from '@/lib/auth';
import { isWebRole } from '@/lib/roles';
import { getStrings } from '@/lib/lang-server';
import type { Strings } from '@/lib/strings';
import type { Role } from '@shared/constants';

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getStrings()).titles.wrongRole };
}

type Variant = { icon: IconName; title: string; body: string };

/** Keyed by role (type-checked against shared/constants). Anything else → "not set up yet". */
const appRoleVariants = (s: Strings): Partial<Record<Role, Variant>> => ({
  waiter: { icon: 'phone-portrait-outline', title: s.wrongRole.appTitle, body: s.wrongRole.waiterBody },
  cook: { icon: 'flame-outline', title: s.wrongRole.appTitle, body: s.wrongRole.cookBody },
});
const noRole = (s: Strings): Variant => ({
  icon: 'person-circle-outline',
  title: s.wrongRole.noRoleTitle,
  body: s.wrongRole.noRoleBody,
});

export default async function WrongRolePage() {
  const viewer = await getViewer();
  if (viewer.kind === 'signed-out') redirect('/login');
  const role = viewer.kind === 'ok' ? viewer.role : null;
  if (isWebRole(role)) redirect('/dashboard');

  const s = await getStrings();
  const variant = (role && appRoleVariants(s)[role]) || noRole(s);
  const name = viewer.kind === 'ok' && viewer.fullName ? viewer.fullName : viewer.email;

  return (
    <main className="min-h-screen bg-background flex flex-col items-center px-4 py-8 md:py-16">
      <div className="w-full max-w-login-card">
        <div className="mb-12 flex items-center gap-3">
          <BrandMark />
          <span className="text-md font-bold">{s.brand.name}</span>
          <LangSwitch className="ml-auto" />
        </div>
        <div className="bg-surface border border-border rounded-xl shadow-md p-6 md:p-8 flex flex-col items-center text-center">
          <div className="size-hero-circle rounded-full bg-primary-soft grid place-items-center">
            <Icon name={variant.icon} className="size-icon-xl text-primary" />
          </div>
          <h1 className="mt-6 text-2xl font-bold text-text">{variant.title}</h1>
          <p className="mt-3 text-md text-text-muted">{variant.body}</p>
          <div className="mt-6 w-full bg-surface-muted rounded-lg p-4 flex items-center gap-3 text-left">
            <Avatar name={viewer.kind === 'ok' ? viewer.fullName : ''} className="bg-surface" />
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">{name}</p>
              {role && <p className="text-xs text-text-muted">{s.roles[role]}</p>}
            </div>
          </div>
          <SignOutButton fullWidth className="mt-6" />
        </div>
      </div>
    </main>
  );
}
