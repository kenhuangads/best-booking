'use client';

import Link from 'next/link';
import { useState } from 'react';
import useSWR from 'swr';
import { ErrorBox, ListSkeleton } from '@/components/ResultBits';
import { toast } from '@/components/Toast';
import { EmptyState, PageHeader } from '@/components/ui';
import { WatchCard } from '@/components/WatchCard';
import { api, errText, fetcher } from '@/lib/client';
import type { Watch } from '@/lib/types';

export default function WatchesPage() {
  const { data, error, isLoading, mutate } = useSWR<{ watches: Watch[] }>('/api/watches', fetcher, { refreshInterval: 30_000 });
  const [checking, setChecking] = useState(false);
  const ws = data?.watches ?? [];
  const activeCount = ws.filter((w) => w.active).length;

  const checkAll = async () => {
    setChecking(true);
    try {
      const r = await api<{ outcomes: { notified: boolean; error: string | null }[] }>('/api/watches/check-all');
      const notified = r.outcomes.filter((o) => o.notified).length;
      const errors = r.outcomes.filter((o) => o.error).length;
      toast(`已檢查 ${r.outcomes.length} 筆${notified ? `，通知 ${notified} 筆` : ''}${errors ? `，${errors} 筆失敗` : ''}`, errors && !notified ? 'err' : 'ok');
      await mutate();
    } catch (e) {
      toast(errText(e), 'err');
    } finally {
      setChecking(false);
    }
  };

  return (
    <main>
      <PageHeader
        title="追蹤清單"
        subtitle={ws.length ? `${activeCount} 筆進行中，系統會依頻率自動檢查` : '設定目標價，降價自動通知'}
        right={
          activeCount > 0 ? (
            <button
              type="button"
              onClick={checkAll}
              disabled={checking}
              className="h-9 shrink-0 rounded-full bg-brand-600 px-3.5 text-xs font-semibold text-white tap disabled:opacity-50"
            >
              {checking ? '檢查中…' : '全部立即檢查'}
            </button>
          ) : undefined
        }
      />
      <div className="space-y-3 px-4 py-4">
        {isLoading ? (
          <ListSkeleton rows={3} />
        ) : error ? (
          <ErrorBox message={(error as Error).message} onRetry={() => mutate()} />
        ) : ws.length === 0 ? (
          <EmptyState
            icon="🔔"
            title="還沒有追蹤項目"
            hint="搜尋機票或住宿後，點「追蹤最低價」就會出現在這裡"
            action={
              <Link href="/" className="block h-12 rounded-2xl bg-brand-600 text-center font-semibold leading-[48px] text-white shadow-lg shadow-brand-600/25">
                去搜尋
              </Link>
            }
          />
        ) : (
          ws.map((w) => <WatchCard key={w.id} w={w} onChanged={() => mutate()} />)
        )}
      </div>
    </main>
  );
}
