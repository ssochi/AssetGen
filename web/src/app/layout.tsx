import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { SiteNav } from '@/components/site-nav';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'AssetGen: Pixel Foundry',
  description: 'Generate AI-assisted pixel art, publish to the community, and benchmark models.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-[#05060a] text-white`}>
        <div className="min-h-screen">
          <SiteNav />
          {children}
        </div>
      </body>
    </html>
  );
}
