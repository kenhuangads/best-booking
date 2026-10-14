'use client';

import Link from 'next/link';
import { fmtPrice, relTime } from '@/lib/format';
import type { ProviderName } from '@/lib/types';
import { Skeleton } from './ui';

export function ResultHeader({ title, subtitle, backHref = '/' }: { title: string; subtitle: string; backHref?: string }) {
  return (
    <header className="sticky top-0 z-30 flex h-[62px] items-center gap-2 border-b border-gray-200/70 bg-gray-50/95 px-2 backdrop-blur">
      <Link href={backHref} aria-label="返回" className="flex h-10 w-10 items-center justify-center rounded-full text-gray-700 tap">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m15 5-7 7 7 7" />
        </svg>
      </Link>
      <div className="min-w-0 flex-1">
        <div className="truncate text-base font-bold leading-tight">{title}</div>
        <div className="truncate text-[11px] text-gray-500">{subtitle}</div>
      </div>
      <Link href={backHref} className="mr-1 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium tap">
        修改
      </Link>
    </header>
  );
}

export function StickyCTA({ price, currency, label, onClick }: { price: number; currency: string; label: string; onClick: () => void }) {
  return (
    <div className="fixed bottom-[calc(72px+env(safe-area-inset-bottom))] left-1/2 z-30 w-full max-w-md -translate-x-1/2 px-4">
      <div className="flex items-center justify-between gap-3 rounded-2xl bg-gray-900 px-4 py-3 text-white shadow-xl">
        <div>
          <div className="text-[11px] text-white/70">{label}</div>
          <div className="text-lg font-bold leading-tight">{fmtPrice(price, currency)}</div>
        </div>
        <button type="button" onClick={onClick} className="h-10 rounded-xl bg-deal px-4 text-sm font-semibold text-white tap">
          🔔 追蹤最低價
        </button>
      </div>
    </div>
  );
}

export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="rounded-2xl bg-white p-4 shadow-card">
          <Skeleton className="h-4 w-28" />
          <div className="mt-4 flex items-center justify-between">
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-8 w-16" />
          </div>
          <div className="mt-4 flex items-center justify-between">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-6 w-28" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-center">
      <div className="text-2xl">😵</div>
      <div className="mt-1 text-sm font-semibold text-red-700">搜尋失敗</div>
      <div className="mt-1 break-words text-xs text-red-600">{message}</div>
      {onRetry && (
        <button type="button" onClick={onRetry} className="mt-3 h-10 rounded-xl bg-white px-4 text-sm font-medium text-red-700 shadow-sm tap">
          重試
        </button>
      )}
    </div>
  );
}

export function providerLabel(p: ProviderName): string {
  return { serpapi: 'Google 即時價格', travelpayouts: 'Aviasales 48 小時內查到的價格', amadeus: 'Amadeus 報價', demo: '示範資料（模擬）' }[p];
}

export function Footnote({ provider, fetchedAt, cached, warnings }: { provider: ProviderName; fetchedAt: string; cached: boolean; warnings: string[] }) {
  return (
    <div className="px-2 pb-2 pt-1 text-center text-[11px] leading-relaxed text-gray-400">
      資料來源：{providerLabel(provider)} · 更新於 {relTime(fetchedAt)}
      {cached ? '（快取）' : ''}
      {warnings.map((w) => (
        <div key={w} className="mt-1">
          {w}
        </div>
      ))}
    </div>
  );
}
