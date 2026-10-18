'use client';

// The frame around every (app) page: sidebar on laptop, top bar + nav drawer below lg.

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { Role } from '@shared/constants';
import { Drawer } from '@/components/Drawer';
import { Icon, type IconName } from '@/components/icons';
import { SignOutButton } from '@/components/SignOutButton';
import { Avatar, BrandMark, cx } from '@/components/ui';
import { isSigningOut } from '@/lib/session';
import { useStock } from '@/lib/stock/StockProvider';
import { roleLabels, s } from '@/lib/strings';
import { getSupabase } from '@/lib/supabase/client';

export type FrameUser = { fullName: string; email: string; role: Role } | null;

const NAV: { href: string; label: string; icon: IconName; stock?: boolean }[] = [
  { href: '/dashboard', label: s.nav.dashboard, icon: 'stats-chart-outline' },
  { href: '/stock', label: s.nav.stock, icon: 'cube-outline', stock: true },
  { href: '/menu', label: s.nav.menu, icon: 'restaurant-outline' },
];

function NavList({ onNavigate, activeRef }: { onNavigate?: () => void; activeRef?: React.RefObject<HTMLAnchorElement | null> }) {
  const pathname = usePathname();
  const { lowCount } = useStock();
  return (
    <ul className="mt-8 flex flex-col gap-1">
      {NAV.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              ref={active ? activeRef : undefined}
              onClick={onNavigate}
              aria-current={active ? 'page' : undefined}
              className={cx(
                'h-12 flex items-center gap-3 px-3 rounded-md text-md transition-colors motion-reduce:transition-none',
                active
                  ? 'bg-primary-soft text-primary font-semibold'
                  : 'font-medium text-text-muted hover:bg-surface-muted hover:text-text',
              )}
            >
              <Icon name={item.icon} className={cx('size-icon', active ? 'text-primary' : 'text-text-muted')} />
              {item.label}
              {item.stock && lowCount > 0 && (
                <span className="ml-auto min-w-6 h-6 px-2 rounded-full bg-status-low-stock-bg text-status-low-stock-fg text-xs font-bold tabular-nums grid place-items-center">
                  {lowCount}
                  <span className="sr-only"> {s.nav.low}</span>
                </span>
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function SideContent({
  user,
  onNavigate,
  activeRef,
}: {
  user: FrameUser;
  onNavigate?: () => void;
  activeRef?: React.RefObject<HTMLAnchorElement | null>;
}) {
  return (
    <>
      <Link href="/stock" onClick={onNavigate} className="px-2 flex items-center gap-3 rounded-md">
        <BrandMark />
        <span className="flex flex-col">
          <span className="text-md font-bold text-text">{s.brand.name}</span>
          <span className="text-xs text-text-muted">{s.brand.tagline}</span>
        </span>
      </Link>
      <nav aria-label={s.nav.main}>
        <NavList onNavigate={onNavigate} activeRef={activeRef} />
      </nav>
      {user && (
        <div className="mt-auto border-t border-border pt-4">
          <div className="px-2 flex items-center gap-3">
            <Avatar name={user.fullName} />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-text truncate">{user.fullName || user.email}</p>
              <p className="text-xs text-text-muted">{roleLabels[user.role]}</p>
            </div>
          </div>
          <SignOutButton variant="ghost" size="sm" fullWidth className="mt-3 justify-start" />
        </div>
      )}
    </>
  );
}

export function AppFrame({ user, children }: { user: FrameUser; children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { lowCount } = useStock();
  const [navOpen, setNavOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const activeLink = useRef<HTMLAnchorElement>(null);

  // Session ended somewhere else (expired, signed out in another tab): back to login.
  useEffect(() => {
    const { data } = getSupabase().auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT' && !isSigningOut()) {
        router.replace(`/login?next=${encodeURIComponent(window.location.pathname)}&expired=1`);
      }
    });
    return () => data.subscription.unsubscribe();
  }, [router]);

  // Close the nav drawer after navigating.
  const [prevPath, setPrevPath] = useState(pathname);
  if (prevPath !== pathname) {
    setPrevPath(pathname);
    setNavOpen(false);
  }

  return (
    <div className="min-h-screen bg-background lg:grid lg:grid-cols-[var(--spacing-sidebar)_1fr]">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 bg-surface px-4 py-2 rounded-md shadow-lg"
      >
        {s.nav.skip}
      </a>

      <aside className="hidden lg:flex flex-col sticky top-0 h-screen bg-surface border-r border-border px-4 py-6">
        <SideContent user={user} />
      </aside>

      <header className="lg:hidden sticky top-0 z-40 h-top-bar bg-surface border-b border-border px-4 flex items-center justify-between">
        <Link href="/stock" className="flex items-center gap-3 rounded-md">
          <BrandMark />
          <span className="text-md font-bold">{s.brand.name}</span>
        </Link>
        <button
          ref={menuButton}
          type="button"
          onClick={() => setNavOpen(true)}
          aria-expanded={navOpen}
          aria-label={lowCount > 0 ? s.nav.openMenuLow(lowCount) : s.nav.openMenu}
          className="relative -mr-2 size-12 rounded-full grid place-items-center text-text hover:bg-surface-muted"
        >
          <Icon name="menu-outline" className="size-icon-lg" />
          {lowCount > 0 && <span className="absolute top-2 right-2 size-2 rounded-full bg-danger" />}
        </button>
      </header>

      <Drawer
        open={navOpen}
        onClose={() => setNavOpen(false)}
        side="left"
        title={s.nav.main}
        closeLabel={s.nav.closeMenu}
        hideHeader
        initialFocusRef={activeLink}
        returnFocusRef={menuButton}
      >
        <div className="flex-1 flex flex-col px-4 py-6 overflow-y-auto">
          <SideContent user={user} onNavigate={() => setNavOpen(false)} activeRef={activeLink} />
        </div>
      </Drawer>

      <main id="main" className="min-w-0">
        <div className="mx-auto w-full max-w-content px-4 py-6 md:px-6 lg:px-8 lg:py-8 xl:px-10">{children}</div>
      </main>
    </div>
  );
}
