'use client';

import { useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import { fetcher } from '@/lib/client';
import { diffDays, fmtDate, fmtPrice, monthLabel, parseISO, todayISO, WEEKDAYS } from '@/lib/format';
import { getHoliday } from '@/lib/holidays';
import type { CalendarDay, CalendarResponse, FlightSearchParams } from '@/lib/types';
import { Sheet } from './Sheet';
import { Skeleton } from './ui';

function shiftMonth(ym: string, n: number): string {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** 整月最低價日曆：綠色為最便宜的 25% 日期，點選即以該日重新搜尋 */
export function PriceCalendarSheet({
  open,
  onClose,
  params,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  params: FlightSearchParams;
  onPick: (departDate: string) => void;
}) {
  const [month, setMonth] = useState(params.departDate.slice(0, 7));
  useEffect(() => {
    if (open) setMonth(params.departDate.slice(0, 7));
  }, [open, params.departDate]);

  const tripLength = params.returnDate ? diffDays(params.departDate, params.returnDate) : null;
  const qs = new URLSearchParams({ from: params.from, to: params.to, month, cabin: params.cabin });
  if (tripLength != null) qs.set('len', String(tripLength));
  const { data, error, isLoading } = useSWR<CalendarResponse>(open ? `/api/search/calendar?${qs}` : null, fetcher, { revalidateOnFocus: false });
  const currentMonth = todayISO().slice(0, 7);

  const stats = useMemo(() => {
    const days = data?.days ?? [];
    const prices = days.map((d) => d.price).filter((p): p is number => p != null);
    if (!prices.length) return null;
    const sorted = [...prices].sort((a, b) => a - b);
    const min = sorted[0];
    return { min, cheapCut: sorted[Math.floor(sorted.length * 0.25)], minDate: days.find((d) => d.price === min)!.date };
  }, [data]);

  const cells = useMemo<(CalendarDay | null)[]>(() => {
    if (!data) return [];
    const lead = parseISO(`${month}-01`).getDay();
    return [...Array.from({ length: lead }, () => null), ...data.days];
  }, [data, month]);

  return (
    <Sheet open={open} onClose={onClose} title="價格日曆" full>
      <div className="flex items-center justify-between py-1">
        <button
          type="button"
          disabled={month <= currentMonth}
          onClick={() => setMonth(shiftMonth(month, -1))}
          aria-label="上個月"
          className="h-10 w-10 rounded-full bg-gray-100 text-lg disabled:opacity-30 tap"
        >
          ‹
        </button>
        <div className="text-base font-semibold">{monthLabel(month)}</div>
        <button type="button" onClick={() => setMonth(shiftMonth(month, 1))} aria-label="下個月" className="h-10 w-10 rounded-full bg-gray-100 text-lg tap">
          ›
        </button>
      </div>
      <p className="text-center text-xs text-gray-500">
        {params.from} → {params.to} · {tripLength != null ? `來回共 ${tripLength} 天` : '單程'} · 每位成人
      </p>
      {stats && (
        <p className="mt-1 text-center text-xs">
          本月最低 <span className="font-semibold text-emerald-600">{fmtPrice(stats.min, data?.currency)}</span>（{fmtDate(stats.minDate)}）
        </p>
      )}

      <div className="mt-3 grid grid-cols-7 text-center text-xs text-gray-500">
        {WEEKDAYS.map((w, i) => (
          <div key={w} className={i === 0 ? 'text-red-500' : ''}>
            {w}
          </div>
        ))}
      </div>

      {isLoading ? (
        <div className="mt-2 grid grid-cols-7 gap-1">
          {Array.from({ length: 35 }).map((_, i) => (
            <Skeleton key={i} className="h-14" />
          ))}
        </div>
      ) : error ? (
        <p className="py-10 text-center text-sm text-red-600">{(error as Error).message}</p>
      ) : (
        <div className="mt-2 grid grid-cols-7 gap-1">
          {cells.map((c, i) => {
            if (!c) return <div key={`e${i}`} />;
            const selected = c.date === params.departDate;
            const cheap = !!stats && c.price != null && c.price <= stats.cheapCut;
            const hol = getHoliday(c.date);
            const dow = parseISO(c.date).getDay();
            return (
              <button
                key={c.date}
                type="button"
                disabled={c.price == null}
                onClick={() => {
                  onPick(c.date);
                  onClose();
                }}
                className={`flex h-14 flex-col items-center justify-center rounded-lg border tap disabled:opacity-40 ${
                  selected ? 'border-brand-600 bg-brand-50' : cheap ? 'border-emerald-200 bg-emerald-50' : 'border-gray-100 bg-white'
                }`}
              >
                <span className={`text-sm font-medium ${dow === 0 || hol ? 'text-red-500' : ''}`}>{Number(c.date.slice(8, 10))}</span>
                <span className={`text-[10px] ${cheap ? 'font-semibold text-emerald-700' : 'text-gray-500'}`}>
                  {c.price != null ? c.price.toLocaleString('zh-TW') : '—'}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {data?.warnings.map((w) => (
        <p key={w} className="mt-3 text-center text-[11px] text-gray-400">
          {w}
        </p>
      ))}
      <p className="mt-2 pb-2 text-center text-[11px] text-gray-400">綠色為本月最便宜的 25% 日期，點選日期即以該日重新搜尋</p>
    </Sheet>
  );
}
