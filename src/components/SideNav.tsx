'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NAV_ITEMS, NavIcon } from './TabBar';

/** 電腦版左側選單（螢幕寬度 1024px 以上才顯示） */
export function SideNav() {
  const pathname = usePathname() ?? '/';
  return (
    <aside aria-label="主選單" className="fixed inset-y-0 left-0 z-40 hidden w-56 flex-col border-r border-gray-200 bg-white lg:flex">
      <Link href="/" className="flex items-center gap-3 px-5 pb-6 pt-7">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icons/icon-192.png" alt="" className="h-10 w-10 rounded-xl shadow-sm" />
        <div>
          <div className="font-bold leading-tight">旅行預訂神器</div>
          <div className="mt-0.5 text-[11px] text-gray-500">最低價追蹤 · LINE 通知</div>
        </div>
      </Link>
      <nav className="flex-1 space-y-1 px-3">
        {NAV_ITEMS.map((t) => {
          const active = t.match(pathname);
          return (
            <Link
              key={t.href}
              href={t.href}
              aria-current={active ? 'page' : undefined}
              className={`flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors ${
                active ? 'bg-brand-50 text-brand-700' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <NavIcon active={active}>{t.icon}</NavIcon>
              {t.longLabel}
            </Link>
          );
        })}
      </nav>
      <p className="px-5 py-5 text-[11px] leading-relaxed text-gray-400">價格僅供參考，實際以訂購網站為準</p>
    </aside>
  );
}
