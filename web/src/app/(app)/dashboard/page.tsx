import type { Metadata } from 'next';
import Link from 'next/link';
import { EmptyState } from '@/components/ui';
import { s } from '@/lib/strings';
import { PageHeader } from '../PageHeader';

export const metadata: Metadata = { title: s.titles.dashboard };

export default function DashboardPage() {
  return (
    <>
      <PageHeader title={s.placeholders.dashboardTitle} subtitle={s.placeholders.dashboardSubtitle} />
      <div className="mt-8 bg-surface border border-border rounded-xl py-16 px-6">
        <EmptyState
          icon="stats-chart-outline"
          title={s.placeholders.dashboardEmptyTitle}
          body={s.placeholders.dashboardEmptyBody}
          action={
            <Link
              href="/stock"
              className="inline-flex items-center justify-center h-12 px-5 text-md font-semibold bg-surface text-text border-[1.5px] border-border-control hover:bg-surface-muted rounded-lg"
            >
              {s.placeholders.goToStock}
            </Link>
          }
        />
      </div>
    </>
  );
}
