'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

export interface NavItem {
  href: string;
  label: string;
  /** 電腦版側邊選單用的完整名稱 */
  longLabel: string;
  match: (p: string) => boolean;
  icon: ReactNode;
}

export const NAV_ITEMS: NavItem[] = [
  {
    href: '/',
    label: '搜尋',
    longLabel: '搜尋機票住宿',
    match: (p: string) => p === '/' || p.startsWith('/search'),
    icon: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </>
    ),
  },
  {
    href: '/watches',
    label: '追蹤',
    longLabel: '追蹤清單',
    match: (p: string) => p.startsWith('/watches'),
    icon: <path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1z" />,
  },
  {
    href: '/alerts',
    label: '通知',
    longLabel: '通知紀錄',
    match: (p: string) => p.startsWith('/alerts'),
    icon: (
      <>
        <path d="M18 16v-5a6 6 0 1 0-12 0v5l-2 2h16z" />
        <path d="M10 20a2 2 0 0 0 4 0" />
      </>
    ),
  },
  {
    href: '/settings',
    label: '設定',
    longLabel: '設定',
    match: (p: string) => p.startsWith('/settings'),
    icon: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1" />
      </>
    ),
  },
];

export function NavIcon({ children, active }: { children: ReactNode; active: boolean }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={active ? 2.2 : 1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {children}
    </svg>
  );
}

/** 手機版底部分頁列（電腦版改用側邊選單） */
export function TabBar() {
  const pathname = usePathname() ?? '/';
  return (
    <nav
      aria-label="主選單"
      className="fixed bottom-0 left-1/2 z-40 w-full max-w-md -translate-x-1/2 border-t border-gray-200 bg-white/95 backdrop-blur safe-bottom lg:hidden"
    >
      <ul className="grid grid-cols-4">
        {NAV_ITEMS.map((t) => {
          const active = t.match(pathname);
          return (
            <li key={t.href}>
              <Link
                href={t.href}
                className={`flex h-[60px] flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${
                  active ? 'text-brand-600' : 'text-gray-400'
                }`}
                aria-current={active ? 'page' : undefined}
              >
                <NavIcon active={active}>{t.icon}</NavIcon>
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
