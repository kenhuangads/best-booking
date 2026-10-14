'use client';

import { airlineName } from '@/lib/airlines';
import { diffDays, fmtDuration, fmtPrice, fmtTime } from '@/lib/format';
import type { FlightOffer, Itinerary } from '@/lib/types';
import { Tag } from './ui';

export function AirlineBadge({ code }: { code: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-gray-600">
      <span className="inline-flex h-6 min-w-[36px] items-center justify-center rounded bg-gray-900 px-1 font-mono text-[11px] font-bold text-white">{code}</span>
      {airlineName(code)}
    </span>
  );
}

export function ItineraryRow({ it, label }: { it: Itinerary; label?: string }) {
  const first = it.segments[0];
  const last = it.segments[it.segments.length - 1];
  const dayDiff = diffDays(first.departAt.slice(0, 10), last.arriveAt.slice(0, 10));
  const via = it.segments.slice(0, -1).map((s) => s.to).join('/');
  return (
    <div className="flex items-center gap-3">
      {label && <span className="w-7 shrink-0 text-[11px] text-gray-400">{label}</span>}
      <div className="w-14 shrink-0">
        <div className="text-lg font-semibold leading-tight tabular-nums">{fmtTime(first.departAt)}</div>
        <div className="text-xs text-gray-500">{first.from}</div>
      </div>
      <div className="flex-1 text-center">
        <div className="text-[11px] text-gray-500">{fmtDuration(it.durationMin)}</div>
        <div className="relative my-1 h-px bg-gray-300">
          {it.stops > 0 && <span className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-orange-400 bg-white" />}
        </div>
        <div className={`text-[11px] ${it.stops ? 'text-orange-600' : 'text-emerald-600'}`}>{it.stops ? `轉機 ${it.stops} 次${via ? ` · ${via}` : ''}` : '直飛'}</div>
      </div>
      <div className="w-14 shrink-0 text-right">
        <div className="text-lg font-semibold leading-tight tabular-nums">
          {fmtTime(last.arriveAt)}
          {dayDiff > 0 && <sup className="ml-0.5 text-[10px] font-medium text-deal">+{dayDiff}</sup>}
        </div>
        <div className="text-xs text-gray-500">{last.to}</div>
      </div>
    </div>
  );
}

export function FlightCard({ offer, best, onClick }: { offer: FlightOffer; best?: boolean; onClick: () => void }) {
  const carriers = [...new Set(offer.carriers)];
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-2xl bg-white p-4 text-left shadow-card transition-shadow tap lg:hover:shadow-md xl:flex xl:items-center xl:gap-6 xl:p-5"
    >
      {/* 電腦寬螢幕：左欄航空公司、中欄航班、右欄價格 */}
      <div className="flex items-center justify-between gap-2 xl:w-36 xl:shrink-0 xl:flex-col xl:items-start xl:justify-center">
        <div className="flex flex-wrap gap-2">
          {carriers.map((c) => (
            <AirlineBadge key={c} code={c} />
          ))}
        </div>
        {best && <span className="shrink-0 rounded-full bg-deal/10 px-2 py-0.5 text-[11px] font-semibold text-deal">最低價</span>}
      </div>
      <div className="mt-3 xl:mt-0 xl:min-w-0 xl:flex-1">
        <div className="space-y-3">
          {offer.itineraries.map((it, i) => (
            <ItineraryRow key={i} it={it} label={offer.itineraries.length > 1 ? (i === 0 ? '去程' : '回程') : offer.returnPending ? '去程' : undefined} />
          ))}
        </div>
        {offer.returnPending && <div className="mt-2 text-[11px] text-gray-500">價格為來回總價，回程班次請在預訂網站選擇</div>}
        {offer.approximate && <div className="mt-2 text-[11px] text-gray-500">48 小時內查到的價格，到達時間為估計</div>}
      </div>
      <div className="mt-3 flex items-end justify-between border-t border-gray-100 pt-3 xl:mt-0 xl:w-40 xl:shrink-0 xl:flex-col-reverse xl:items-end xl:justify-center xl:gap-2 xl:border-l xl:border-t-0 xl:pl-6 xl:pt-0">
        <div className="flex flex-wrap gap-1.5 xl:justify-end">
          {offer.baggageIncluded === true && <Tag>含託運行李</Tag>}
          {offer.baggageIncluded === false && <Tag tone="muted">不含託運行李</Tag>}
          {offer.seatsLeft != null && offer.seatsLeft <= 5 && <Tag tone="warn">剩 {offer.seatsLeft} 位</Tag>}
        </div>
        <div className="text-right">
          <div className="text-xl font-bold text-gray-900">{fmtPrice(offer.price, offer.currency)}</div>
          {offer.pricePerAdult !== offer.price && <div className="text-[11px] text-gray-500">每位成人 {fmtPrice(offer.pricePerAdult, offer.currency)}</div>}
        </div>
      </div>
    </button>
  );
}
