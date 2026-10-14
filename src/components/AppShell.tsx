'use client';

import { usePathname } from 'next/navigation';
import { SideNav } from './SideNav';
import { TabBar } from './TabBar';
import { Toaster } from './Toast';

/**
 * 手機：置中單欄＋底部分頁列。
 * 電腦（1024px 以上）：左側選單＋寬版內容區。
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? '/';
  if (pathname.startsWith('/login')) {
    return (
      <>
        {children}
        <Toaster />
      </>
    );
  }
  return (
    <>
      <SideNav />
      <div className="relative mx-auto min-h-dvh w-full max-w-md bg-gray-50 pb-[calc(72px+env(safe-area-inset-bottom))] shadow-[0_0_0_1px_rgba(0,0,0,0.04)] lg:max-w-none lg:pb-12 lg:pl-56 lg:shadow-none">
        <div className="lg:mx-auto lg:max-w-6xl">{children}</div>
      </div>
      <TabBar />
      <Toaster />
    </>
  );
}
