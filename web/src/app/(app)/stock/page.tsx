import type { Metadata } from 'next';
import { getStrings } from '@/lib/lang-server';
import { StockView } from './StockView';

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getStrings()).titles.stock };
}

export default async function StockPage({ searchParams }: PageProps<'/stock'>) {
  const { q, show } = await searchParams;
  return <StockView initialQuery={typeof q === 'string' ? q : ''} initialLowOnly={show === 'low'} />;
}
