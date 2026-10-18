import type { Metadata } from 'next';
import { s } from '@/lib/strings';
import { StockView } from './StockView';

export const metadata: Metadata = { title: s.titles.stock };

export default async function StockPage({ searchParams }: PageProps<'/stock'>) {
  const { q, show } = await searchParams;
  return <StockView initialQuery={typeof q === 'string' ? q : ''} initialLowOnly={show === 'low'} />;
}
