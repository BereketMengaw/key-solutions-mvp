import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { BrandMark } from '@/components/ui';
import { getViewer, homeFor } from '@/lib/auth';
import { safeNext } from '@/lib/safe-next';
import { s } from '@/lib/strings';
import { LoginForm } from './LoginForm';

export const metadata: Metadata = { title: s.titles.login };

export default async function LoginPage({ searchParams }: PageProps<'/login'>) {
  const params = await searchParams;
  const viewer = await getViewer();
  if (viewer.kind === 'ok') redirect(homeFor(viewer.role));

  return (
    <div className="min-h-screen grid lg:grid-cols-[5fr_7fr]">
      <section className="relative overflow-hidden bg-primary text-text-on-primary p-12 hidden lg:flex flex-col justify-between">
        <div className="flex items-center gap-4">
          <BrandMark large />
          <span className="text-xl font-bold">{s.brand.name}</span>
        </div>
        <div className="relative">
          <p className="max-w-[28ch] text-3xl font-bold">{s.brand.headline}</p>
          <p className="mt-4 max-w-[28ch] text-lg text-primary-soft">{s.brand.body}</p>
        </div>
        <p className="relative text-sm text-primary-soft">{s.brand.footer}</p>
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <span className="absolute right-0 bottom-0 w-[70%] aspect-square translate-x-1/2 translate-y-1/2 rounded-full border-2 border-primary-soft/15" />
          <span className="absolute right-0 bottom-0 w-[110%] aspect-square translate-x-1/2 translate-y-1/2 rounded-full border-2 border-primary-soft/15" />
        </div>
      </section>

      <main className="flex flex-col items-center justify-start lg:justify-center px-4 py-8 md:px-6 md:py-12">
        <div className="w-full max-w-login-card">
          <div className="lg:hidden mb-8">
            <BrandMark large className="shadow-md" />
            <p className="mt-6 text-2xl font-bold">{s.brand.name}</p>
            <p className="mt-2 text-md text-text-muted">{s.brand.headline}</p>
          </div>
          <LoginForm next={safeNext(params.next)} expired={params.expired === '1'} />
          <p className="mt-6 text-center text-sm text-text-muted">{s.login.appHint}</p>
        </div>
      </main>
    </div>
  );
}
