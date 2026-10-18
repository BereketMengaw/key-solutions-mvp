import type { Metadata } from 'next';
import { EmptyState } from '@/components/ui';
import { getStrings } from '@/lib/lang-server';
import { PageHeader } from '../PageHeader';

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getStrings()).titles.menu };
}

export default async function MenuPage() {
  const s = await getStrings();
  return (
    <>
      <PageHeader title={s.placeholders.menuTitle} subtitle={s.placeholders.menuSubtitle} />
      <div className="mt-8 bg-surface border border-border rounded-xl py-16 px-6">
        <EmptyState icon="restaurant-outline" title={s.placeholders.menuEmptyTitle} body={s.placeholders.menuEmptyBody} />
      </div>
    </>
  );
}
