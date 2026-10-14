'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { FlightSearchForm } from '@/components/FlightSearchForm';
import { HotelSearchForm } from '@/components/HotelSearchForm';
import { SegmentedControl, Skeleton } from '@/components/ui';
import { fetcher } from '@/lib/client';
import { diffDays, fmtDate, relTime, todayISO } from '@/lib/format';
import { upcomingLongWeekends, type LongWeekend } from '@/lib/holidays';
import type { Watch } from '@/lib/types';

const STEPS = [
  { icon: '🔍', title: '即時比價', text: '輸入條件，一次看到多家航空與飯店的最低價，連假日期一眼可見。' },
  { icon: '🎯', title: '設定目標價', text: '在結果頁點「追蹤最低價」，設定理想價格與檢查頻率，系統會持續盯價。' },
  { icon: '💬', title: 'LINE 通知', text: '達標或降價時，立刻推播到 LINE / Telegram，附上預訂連結直接下手。' },
];

function FormSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-48 w-full" />
      <Skeleton className="h-14 w-full" />
    </div>
  );
}

export default function HomePage() {
  const [tab, setTab] = useState<'flight' | 'hotel'>('flight');
  // 表單日期依「今天」計算，等瀏覽器載入後再顯示，避免伺服器與手機時間不同造成畫面閃動
  const [mounted, setMounted] = useState(false);
  const [weekends, setWeekends] = useState<LongWeekend[]>([]);
  useEffect(() => {
    setMounted(true);
    setWeekends(upcomingLongWeekends(todayISO(), 5));
  }, []);

  const { data } = useSWR<{ watches: Watch[] }>('/api/watches', fetcher, { revalidateOnFocus: false });
  const active = data?.watches.filter((w) => w.active) ?? [];
  const hits = active.filter((w) => w.targetPrice != null && w.lastPrice != null && w.lastPrice <= w.targetPrice);
  const latest = active.map((w) => w.lastCheckedAt).filter(Boolean).sort().at(-1) ?? null;

  return (
    <main className="lg:px-8 lg:pt-8">
      <div className="bg-gradient-to-br from-brand-700 via-brand-600 to-sky-500 px-4 pb-16 pt-8 text-white safe-top lg:rounded-3xl lg:px-10 lg:pb-28 lg:pt-12">
        <h1 className="text-2xl font-bold tracking-tight lg:text-4xl">旅行預訂神器</h1>
        <p className="mt-1 text-sm text-white/85 lg:mt-3 lg:text-base">即時比價機票與住宿，最低價直接通知到 LINE</p>
      </div>

      <div className="-mt-10 px-4 lg:-mt-20 lg:grid lg:grid-cols-[minmax(0,440px)_minmax(0,1fr)] lg:items-start lg:gap-6 lg:px-6">
        <div className="rounded-3xl bg-white p-3 shadow-card lg:p-4 lg:shadow-xl">
          <SegmentedControl
            value={tab}
            onChange={setTab}
            options={[
              { value: 'flight', label: '✈️ 機票' },
              { value: 'hotel', label: '🏨 住宿' },
            ]}
          />
          <div className="mt-3">{!mounted ? <FormSkeleton /> : tab === 'flight' ? <FlightSearchForm /> : <HotelSearchForm />}</div>
        </div>

        <div className="mt-4 space-y-4 lg:mt-0">
          {active.length > 0 && (
            <Link href="/watches" className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 shadow-card tap lg:px-5 lg:py-4 lg:hover:shadow-md">
              <div>
                <div className="text-sm font-semibold lg:text-base">
                  追蹤中 {active.length} 筆{hits.length > 0 && <span className="ml-1 text-deal">· {hits.length} 筆已達目標價 🎯</span>}
                </div>
                <div className="text-xs text-gray-500">最近檢查：{latest ? relTime(latest) : '尚未'}</div>
              </div>
              <span className="text-xl text-gray-300">›</span>
            </Link>
          )}

          {weekends.length > 0 && (
            <section className="hidden rounded-2xl bg-white p-5 shadow-card lg:block">
              <h2 className="text-sm font-semibold">🎌 近期連假</h2>
              <ul className="mt-2 divide-y divide-gray-100">
                {weekends.map((lw) => (
                  <li key={lw.start} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                    <span className="font-medium">
                      {lw.name}
                      {lw.estimated ? '*' : ''}
                    </span>
                    <span className="text-gray-500">
                      {fmtDate(lw.start)} – {fmtDate(lw.end)} · {diffDays(lw.start, lw.end) + 1} 天
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-[11px] text-gray-400">選日期時也能一鍵選連假。* 為推算日期，以人事行政總處公告為準。</p>
            </section>
          )}

          <section className="space-y-3 pt-2 lg:grid lg:grid-cols-3 lg:gap-3 lg:space-y-0 lg:pt-0">
            {STEPS.map((s, i) => (
              <div key={s.title} className="flex gap-3 rounded-2xl bg-white p-4 shadow-card lg:flex-col">
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
      </div>
    </main>
  );
}
