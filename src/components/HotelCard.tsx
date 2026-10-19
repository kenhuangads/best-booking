'use client';

import { fmtPrice } from '@/lib/format';
import type { HotelOffer } from '@/lib/types';
import { Tag } from './ui';

export function Stars({ n }: { n?: number }) {
  if (!n) return null;
  return <span className="text-amber-500">{'★'.repeat(Math.round(n))}</span>;
}

export function RatingBadge({ rating, count }: { rating?: number; count?: number }) {
  if (rating == null) return null;
  return (
    <span className="inline-flex items-center gap-1">
      <span className="rounded bg-brand-600 px-1 py-0.5 text-[11px] font-semibold text-white">{rating.toFixed(1)}</span>
      {count ? <span>{count.toLocaleString('zh-TW')} 則評價</span> : null}
    </span>
  );
}

export function HotelCard({ offer, best, onClick }: { offer: HotelOffer; best?: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex w-full gap-3 rounded-2xl bg-white p-3 text-left shadow-card transition-shadow tap lg:hover:shadow-md">
      <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-100 to-brand-100 text-3xl">🏨</div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="line-clamp-2 text-sm font-semibold leading-snug">{offer.name}</div>
          {best && <span className="shrink-0 rounded-full bg-deal/10 px-2 py-0.5 text-[11px] font-semibold text-deal">最低價</span>}
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-gray-500">
          <Stars n={offer.stars} />
          <RatingBadge rating={offer.rating} count={offer.reviewCount} />
        </div>
        <div className="mt-0.5 truncate text-xs text-gray-500">
          {[offer.area, offer.distanceKm != null ? `距市中心 ${offer.distanceKm} km` : ''].filter(Boolean).join(' · ')}
        </div>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {offer.breakfast && <Tag>含早餐</Tag>}
          {offer.freeCancel && <Tag tone="ok">免費取消</Tag>}
          {offer.roomType && <Tag tone="muted">{offer.roomType}</Tag>}
        </div>
        {offer.noPrice ? (
          <div className="mt-1.5 rounded-lg bg-amber-50 px-2 py-1.5 text-[11px] leading-snug text-amber-800">
            這個日期查不到房價，可能還沒開放訂房或已客滿。可先加入追蹤，開放後自動通知。
          </div>
        ) : (
          <div className="mt-1.5 flex items-end justify-between">
            <div className="text-[11px] text-gray-500">{offer.nights} 晚總價</div>
            <div className="text-right">
              <div className="text-lg font-bold leading-tight">{fmtPrice(offer.totalPrice, offer.currency)}</div>
              <div className="text-[11px] text-gray-500">每晚 {fmtPrice(offer.pricePerNight, offer.currency)}</div>
            </div>
          </div>
        )}
      </div>
    </button>
  );
}
