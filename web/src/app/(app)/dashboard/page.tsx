import type { Metadata } from 'next';
import { s } from '@/lib/strings';
import { DashboardView } from './DashboardView';

export const metadata: Metadata = { title: s.titles.dashboard };

/** The request time, so the server and the first client render show the same Addis date. */
function requestTime(): number {
  return Date.now();
}

export default function DashboardPage() {
  return <DashboardView serverNow={requestTime()} />;
}
