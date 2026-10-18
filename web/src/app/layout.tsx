import type { Metadata } from 'next';
import { Noto_Sans, Noto_Sans_Ethiopic } from 'next/font/google';
import { LangProvider } from '@/components/LangProvider';
import { getLang, getStrings } from '@/lib/lang-server';
import './globals.css';

const noto = Noto_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-noto',
  display: 'swap',
});

// Ge'ez script. Always in the font stack after Noto Sans, so Amharic names render even in
// English mode; the browser only downloads it when Ge'ez text is on the page (unicode-range).
const ethiopic = Noto_Sans_Ethiopic({
  subsets: ['ethiopic'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-ethiopic',
  display: 'swap',
  preload: false,
});

export async function generateMetadata(): Promise<Metadata> {
  const s = await getStrings();
  return { title: s.brand.name, description: s.brand.headline };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const lang = await getLang();
  return (
    <html lang={lang} className={`${noto.variable} ${ethiopic.variable}`}>
      <body className="min-h-screen antialiased">
        <LangProvider lang={lang}>{children}</LangProvider>
      </body>
    </html>
  );
}
