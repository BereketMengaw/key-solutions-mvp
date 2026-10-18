import type { Metadata } from 'next';
import { EmptyState } from '@/components/ui';
import { s } from '@/lib/strings';
import { PageHeader } from '../PageHeader';

export const metadata: Metadata = { title: s.titles.menu };

export default function MenuPage() {
  return (
    <>
      <PageHeader title={s.placeholders.menuTitle} subtitle={s.placeholders.menuSubtitle} />
      <div className="mt-8 bg-surface border border-border rounded-xl py-16 px-6">
        <EmptyState icon="restaurant-outline" title={s.placeholders.menuEmptyTitle} body={s.placeholders.menuEmptyBody} />
      </div>
    </>
  );
}
