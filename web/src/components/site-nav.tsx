'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { usePathname } from 'next/navigation';

const NAV_LINKS: Array<{ href: Route; label: string }> = [
  { href: '/', label: 'Overview' },
  { href: '/generate', label: 'Pixel Lab' },
  { href: '/community', label: 'Community' },
  { href: '/leaderboard', label: 'Leaderboard' },
];

function linkClasses(active: boolean) {
  return [
    'text-sm font-medium transition rounded-full px-3 py-1.5',
    active
      ? 'bg-white/20 text-white'
      : 'text-white/60 hover:text-white hover:bg-white/10',
  ].join(' ');
}

export function SiteNav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-[#04050a]/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Link href="/" className="text-lg font-semibold tracking-tight text-white">
          AssetGen · Pixel Foundry
        </Link>
        <nav className="flex flex-wrap items-center gap-3">
          {NAV_LINKS.map((item) => {
            const active =
              item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href} className={linkClasses(active)}>
                {item.label}
              </Link>
            );
          })}
          <Link
            href="/generate"
            className="rounded-full bg-brand-500 px-4 py-2 text-sm font-semibold text-white shadow-glow transition hover:bg-brand-400"
          >
            Start Creating
          </Link>
        </nav>
      </div>
    </header>
  );
}
