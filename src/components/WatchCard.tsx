'use client';

import Link from 'next/link';
import { useState } from 'react';
import { api, errText } from '@/lib/client';
import { fmtPrice, intervalLabel, relTime } from '@/lib/format';
import { flightParamsToQuery, hotelParamsToQuery } from '@/lib/schemas';
import type { Watch } from '@/lib/types';
import { watchSubtitle } from '@/lib/watchText';
import { Sparkline } from './Sparkline';
import { toast } from './Toast';
import { WatchFormSheet } from './WatchFormSheet';

type Busy = null | 'check' | 'toggle' | 'delete';

export function WatchCard({ w, onChanged }: { w: Watch; onChanged: () => void }) {
  const [busy, setBusy] = useState<Busy>(null);
  const [form, setForm] = useState<null | 'edit' | 'copy'>(null);
  const price = w.lastPrice;
  const target = w.targetPrice;
  const hit = price != null && target != null && price <= target;
  const status = !w.active
    ? { label: '已暫停', cls: 'bg-gray-100 text-gray-500' }
    : w.lastError
      ? { label: '錯誤', cls: 'bg-red-50 text-red-600' }
      : hit
        ? { label: '🎯 已達目標', cls: 'bg-emerald-50 text-emerald-700' }
        : { label: '追蹤中', cls: 'bg-brand-50 text-brand-700' };
  const searchHref = `/search?${w.type === 'flight' ? flightParamsToQuery(w.params) : hotelParamsToQuery(w.params)}`;
  const bookUrl = w.lastResult?.deepLinks[0]?.url;
  const currency = w.lastResult?.currency ?? 'TWD';
  const sourceLabel = w.lastResult
    ? { serpapi: 'Google 確認', travelpayouts: '快取價', amadeus: 'Amadeus', demo: '示範' }[w.lastResult.source]
    : null;
  // 價格真正查到的時間（依額度延後的檢查不算）
  const lastPriceAt = w.history.at(-1)?.checkedAt ?? null;

  const run = async (kind: Busy, fn: () => Promise<unknown>) => {
    setBusy(kind);
    try {
      await fn();
      onChanged();
    } catch (e) {
      toast(errText(e), 'err');
    } finally {
      setBusy(null);
    }
  };

  const check = () =>
    run('check', async () => {
      const r = await api<{ outcome: { price: number | null; notified: boolean; error: string | null; skipped: boolean; note: string | null } }>(
        `/api/watches/${w.id}/check`,
      );
      if (r.outcome.error) toast(r.outcome.error, 'err');
      else if (r.outcome.skipped) toast(r.outcome.note ?? '已檢查，價格沒有變化');
      else toast(r.outcome.notified ? `已通知！目前 ${fmtPrice(r.outcome.price, currency)}` : `目前最低 ${fmtPrice(r.outcome.price, currency)}`);
    });
  const toggle = () => run('toggle', () => api(`/api/watches/${w.id}`, { method: 'PATCH', body: { active: !w.active } }));
  const del = () => {
    if (!window.confirm(`確定刪除「${w.title}」的追蹤？`)) return;
    void run('delete', () => api(`/api/watches/${w.id}`, { method: 'DELETE' }));
  };

  const gap = price != null && target != null ? price - target : null;
  const btn = 'flex h-10 items-center justify-center rounded-xl text-xs font-medium tap disabled:opacity-50';

  return (
    <div className="rounded-2xl bg-white p-4 shadow-card">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span aria-hidden>{w.type === 'flight' ? '✈️' : '🏨'}</span>
            <h3 className="truncate font-semibold">{w.title}</h3>
          </div>
          <div className="mt-0.5 text-xs text-gray-500">{watchSubtitle(w)}</div>
        </div>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${status.cls}`}>{status.label}</span>
      </div>

      <div className="mt-3 flex items-end justify-between">
        <div>
          <div className="text-[11px] text-gray-500">
            目前最低{sourceLabel && <span className="ml-1 rounded bg-gray-100 px-1 py-0.5 text-[10px] text-gray-500">{sourceLabel}</span>}
          </div>
          <div className="text-2xl font-bold leading-tight">{fmtPrice(price, currency)}</div>
          <div className="mt-0.5 text-[11px] text-gray-500">
            {w.lowestPrice != null ? `歷史最低 ${fmtPrice(w.lowestPrice, currency)}` : ''}
            {target != null ? `${w.lowestPrice != null ? ' · ' : ''}目標 ${fmtPrice(target, currency)}` : ''}
          </div>
        </div>
        <Sparkline points={w.history.map((h) => h.price)} target={target} className="h-12 w-28" />
      </div>

      {gap != null && target != null && price != null && (
        <div className="mt-2">
          <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
            <div
              className={`h-full rounded-full ${hit ? 'bg-emerald-500' : 'bg-brand-500'}`}
              style={{ width: `${hit ? 100 : Math.max(8, Math.min(96, (target / price) * 100))}%` }}
            />
          </div>
          <div className="mt-1 text-[11px] text-gray-500">
            {hit ? `✅ 已低於目標價 ${fmtPrice(-gap, currency)}` : `距目標價還差 ${fmtPrice(gap, currency)}（${Math.round((gap / price) * 100)}%）`}
          </div>
        </div>
      )}

      <div className="mt-2 text-[11px] text-gray-400">
        {lastPriceAt ? `上次查價 ${relTime(lastPriceAt)}` : '尚未查價'}
        {!w.note && ` · 每 ${intervalLabel(w.intervalMin)}`}
        {w.notifyOnDrop ? ` · 降 ${w.dropPercent}% 通知` : ''}
      </div>
      {w.note && !w.lastError && <div className="mt-0.5 text-[11px] text-gray-500">{w.note}</div>}
      {w.lastError && <div className="mt-0.5 text-[11px] text-red-500">{w.lastError}</div>}

      <div className="mt-3 grid grid-cols-3 gap-2">
        <button type="button" onClick={check} disabled={!!busy} className={`${btn} bg-brand-50 text-brand-700 lg:hover:bg-brand-100`}>
          {busy === 'check' ? '檢查中…' : '立即檢查'}
        </button>
        <button type="button" onClick={() => setForm('edit')} disabled={!!busy} className={`${btn} bg-gray-100 text-gray-700 lg:hover:bg-gray-200`}>
          ✏️ 編輯
        </button>
        <button type="button" onClick={() => setForm('copy')} disabled={!!busy} className={`${btn} bg-gray-100 text-gray-700 lg:hover:bg-gray-200`}>
          📋 複製換日期
        </button>
        {bookUrl ? (
          <a href={bookUrl} target="_blank" rel="noopener noreferrer" className={`${btn} bg-gray-100 text-gray-700 lg:hover:bg-gray-200`}>
            預訂 ↗
          </a>
        ) : (
          <Link href={searchHref} className={`${btn} bg-gray-100 text-gray-700 lg:hover:bg-gray-200`}>
            查看
          </Link>
        )}
        <button type="button" onClick={toggle} disabled={!!busy} className={`${btn} bg-gray-100 text-gray-700 lg:hover:bg-gray-200`}>
          {w.active ? '暫停' : '恢復'}
        </button>
        <button type="button" onClick={del} disabled={!!busy} className={`${btn} bg-red-50 text-red-600 lg:hover:bg-red-100`}>
          刪除
        </button>
      </div>
      <Link href={searchHref} className="mt-2 block py-1 text-center text-[11px] text-brand-600">
        查看完整搜尋結果 ›
      </Link>
      <WatchFormSheet watch={form ? w : null} mode={form ?? 'edit'} onClose={() => setForm(null)} onSaved={onChanged} />
    </div>
  );
}
