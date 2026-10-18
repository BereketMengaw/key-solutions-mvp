import type { Metadata } from 'next';
import { getStrings } from '@/lib/lang-server';
import { DashboardView } from './DashboardView';

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getStrings()).titles.dashboard };
}

/** The request time, so the server and the first client render show the same Addis date. */
function requestTime(): number {
  return Date.now();
}

export default function DashboardPage() {
  return <DashboardView serverNow={requestTime()} />;
}
