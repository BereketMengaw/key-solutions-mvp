import type { Metadata } from 'next';
import { Noto_Sans } from 'next/font/google';
import { s } from '@/lib/strings';
import './globals.css';

const noto = Noto_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-noto',
  display: 'swap',
});

export const metadata: Metadata = {
  title: s.brand.name,
  description: s.brand.headline,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={noto.variable}>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
