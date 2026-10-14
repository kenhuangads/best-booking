'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { ErrorBox, ListSkeleton } from '@/components/ResultBits';
import { EmptyState, PageHeader } from '@/components/ui';
import { fetcher } from '@/lib/client';
import { fmtPrice, relTime } from '@/lib/format';
import type { AlertRecord, ChannelResult } from '@/lib/types';

/** 卡片已顯示標題與價格，內文去掉重複的標題列與預訂連結 */
function alertBody(a: AlertRecord): string {
  return a.body
    .replace(/\n前往預訂：.*$/s, '')
    .split('\n')
    .filter((line, i) => !(i === 0 && line === a.title))
    .join('\n')
    .trim();
}

function ChannelPill({ c }: { c: ChannelResult }) {
  const name = c.type === 'line' ? 'LINE' : 'Telegram';
  return (
    <span
      title={c.error}
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
        c.ok ? (c.type === 'line' ? 'bg-line/10 text-green-700' : 'bg-telegram/10 text-sky-700') : 'bg-red-50 text-red-600'
      }`}
    >
      {name} {c.ok ? '✓' : '✗'}
      {!c.ok && c.error ? <span className="max-w-[160px] truncate font-normal">{c.error}</span> : null}
    </span>
  );
}

export default function AlertsPage() {
  const { data, error, isLoading, mutate } = useSWR<{ alerts: AlertRecord[] }>('/api/alerts', fetcher, { refreshInterval: 30_000 });
  const alerts = data?.alerts ?? [];

  return (
    <main>
      <PageHeader title="通知紀錄" subtitle="達標、降價與測試通知的傳送結果" />
      <div className={`space-y-3 px-4 py-4 lg:px-8 ${alerts.length ? 'lg:grid lg:grid-cols-2 lg:items-start lg:gap-4 lg:space-y-0' : ''}`}>
        {isLoading ? (
          <ListSkeleton rows={3} />
        ) : error ? (
          <ErrorBox message={(error as Error).message} onRetry={() => mutate()} />
        ) : alerts.length === 0 ? (
          <EmptyState
            icon="📭"
            title="還沒有通知"
            hint="追蹤項目達到目標價或降價時，會在這裡留下紀錄，並推播到你連結的 LINE / Telegram"
            action={
              <Link href="/settings" className="block h-12 rounded-2xl bg-white text-center font-semibold leading-[48px] text-brand-700 shadow-card">
                設定通知管道
              </Link>
            }
          />
        ) : (
          alerts.map((a) => (
            <article key={a.id} className="rounded-2xl bg-white p-4 shadow-card">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold leading-snug">{a.title}</h3>
                <time className="shrink-0 text-[11px] text-gray-400" dateTime={a.createdAt}>
                  {relTime(a.createdAt)}
                </time>
              </div>
              {a.price != null && <div className="mt-1 text-xl font-bold text-deal">{fmtPrice(a.price)}</div>}
              <pre className="mt-2 whitespace-pre-wrap break-words font-sans text-xs leading-relaxed text-gray-600">{alertBody(a)}</pre>
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                {a.channels.length ? (
                  a.channels.map((c, i) => <ChannelPill key={i} c={c} />)
                ) : (
                  <Link href="/settings" className="text-[11px] text-gray-400 underline">
                    未連結通知管道，僅記錄於 App
                  </Link>
                )}
                {a.url && (
                  <a href={a.url} target="_blank" rel="noopener noreferrer" className="ml-auto rounded-full bg-brand-50 px-3 py-1 text-[11px] font-semibold text-brand-700 tap">
                    前往預訂 ↗
                  </a>
                )}
              </div>
            </article>
          ))
        )}
      </div>
    </main>
  );
}
