'use client';

import Link from 'next/link';
import { useState } from 'react';
import useSWR from 'swr';
import { FlightSearchForm } from '@/components/FlightSearchForm';
import { HotelSearchForm } from '@/components/HotelSearchForm';
import { SegmentedControl } from '@/components/ui';
import { fetcher } from '@/lib/client';
import { relTime } from '@/lib/format';
import type { Watch } from '@/lib/types';

const STEPS = [
  { icon: '🔍', title: '即時比價', text: '輸入條件，一次看到多家航空與飯店的最低價，連假日期一眼可見。' },
  { icon: '🎯', title: '設定目標價', text: '在結果頁點「追蹤最低價」，設定理想價格與檢查頻率，系統會持續盯價。' },
  { icon: '💬', title: 'LINE 通知', text: '達標或降價時，立刻推播到 LINE / Telegram，附上預訂連結直接下手。' },
];

export default function HomePage() {
  const [tab, setTab] = useState<'flight' | 'hotel'>('flight');
  const { data } = useSWR<{ watches: Watch[] }>('/api/watches', fetcher, { revalidateOnFocus: false });
  const active = data?.watches.filter((w) => w.active) ?? [];
  const hits = active.filter((w) => w.targetPrice != null && w.lastPrice != null && w.lastPrice <= w.targetPrice);
  const latest = active.map((w) => w.lastCheckedAt).filter(Boolean).sort().at(-1) ?? null;

  return (
    <main>
      <div className="bg-gradient-to-br from-brand-700 via-brand-600 to-sky-500 px-4 pb-16 pt-8 text-white safe-top">
        <h1 className="text-2xl font-bold tracking-tight">旅行預訂神器</h1>
        <p className="mt-1 text-sm text-white/85">即時比價機票與住宿，最低價直接通知到 LINE</p>
      </div>

      <div className="-mt-10 px-4">
        <div className="rounded-3xl bg-white p-3 shadow-card">
          <SegmentedControl
            value={tab}
            onChange={setTab}
            options={[
              { value: 'flight', label: '✈️ 機票' },
              { value: 'hotel', label: '🏨 住宿' },
            ]}
          />
          <div className="mt-3">{tab === 'flight' ? <FlightSearchForm /> : <HotelSearchForm />}</div>
        </div>

        {active.length > 0 && (
          <Link href="/watches" className="mt-4 flex items-center justify-between rounded-2xl bg-white px-4 py-3 shadow-card tap">
            <div>
              <div className="text-sm font-semibold">
                追蹤中 {active.length} 筆{hits.length > 0 && <span className="ml-1 text-deal">· {hits.length} 筆已達目標價 🎯</span>}
              </div>
              <div className="text-xs text-gray-500">最近檢查：{latest ? relTime(latest) : '尚未'}</div>
            </div>
            <span className="text-xl text-gray-300">›</span>
          </Link>
        )}

        <section className="mt-6 space-y-3">
          {STEPS.map((s, i) => (
            <div key={s.title} className="flex gap-3 rounded-2xl bg-white p-4 shadow-card">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-xl">{s.icon}</div>
              <div>
                <div className="text-sm font-semibold">
                  <span className="mr-1 text-brand-600">{i + 1}.</span>
                  {s.title}
                </div>
                <p className="mt-0.5 text-xs leading-relaxed text-gray-500">{s.text}</p>
              </div>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
