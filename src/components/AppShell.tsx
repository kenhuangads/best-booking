'use client';

import { TabBar } from './TabBar';
import { Toaster } from './Toast';

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative mx-auto min-h-dvh w-full max-w-md bg-gray-50 pb-[calc(72px+env(safe-area-inset-bottom))] shadow-[0_0_0_1px_rgba(0,0,0,0.04)]">
      {children}
      <TabBar />
      <Toaster />
    </div>
  );
}
