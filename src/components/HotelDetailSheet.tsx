'use client';

import { getCity } from '@/lib/cities';
import { fmtPrice, fmtRange } from '@/lib/format';
import type { HotelOffer, HotelSearchParams } from '@/lib/types';
import { RatingBadge, Stars } from './HotelCard';
import { Sheet } from './Sheet';
import { PrimaryButton, Tag } from './ui';

export function HotelDetailSheet({
  offer,
  params,
  onClose,
  onWatch,
}: {
  offer: HotelOffer | null;
  params: HotelSearchParams;
  onClose: () => void;
  onWatch: (offer: HotelOffer) => void;
}) {
  const city = getCity(params.city);
  return (
    <Sheet
      open={!!offer}
      onClose={onClose}
      title="住宿詳情"
      footer={
        offer && (
          <div className="flex gap-2">
            <PrimaryButton variant="secondary" onClick={() => onWatch(offer)} className="flex-1">
              🔔 追蹤此飯店
            </PrimaryButton>
            <a
              href={offer.deepLinks[0]?.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-12 flex-1 items-center justify-center rounded-2xl bg-brand-600 font-semibold text-white shadow-lg shadow-brand-600/25 tap"
            >
              前往預訂 ↗
            </a>
          </div>
        )
      }
    >
      {offer && (
        <>
          <div className="flex h-36 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-100 to-brand-100 text-5xl">🏨</div>
          <h3 className="mt-3 text-lg font-bold leading-snug">{offer.name}</h3>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-gray-500">
            <Stars n={offer.stars} />
            <RatingBadge rating={offer.rating} count={offer.reviewCount} />
          </div>
          <div className="mt-1 text-xs text-gray-500">
            {[city?.name, offer.area, offer.distanceKm != null ? `距市中心 ${offer.distanceKm} km` : ''].filter(Boolean).join(' · ')}
          </div>

          <div className="mt-4 rounded-2xl bg-brand-50 p-4">
            <div className="text-xs text-brand-700">
              {fmtRange(params.checkIn, params.checkOut)} · {offer.nights} 晚 · {params.rooms} 房 {params.adults} 人
            </div>
            {offer.noPrice ? (
              <>
                <div className="mt-0.5 text-xl font-bold text-amber-800">這個日期查不到房價</div>
                <div className="mt-0.5 text-xs text-gray-500">可能還沒開放訂房或已客滿。加入追蹤後，開放訂房或有空房時會自動通知你。</div>
              </>
            ) : (
              <>
                <div className="mt-0.5 text-3xl font-bold text-brand-700">{fmtPrice(offer.totalPrice, offer.currency)}</div>
                <div className="mt-0.5 text-xs text-gray-500">每晚 {fmtPrice(offer.pricePerNight, offer.currency)}（含稅費估算）</div>
              </>
            )}
            <div className="mt-2 flex flex-wrap gap-1.5">
              {offer.roomType && <Tag>{offer.roomType}</Tag>}
              {offer.breakfast && <Tag>含早餐</Tag>}
              {offer.freeCancel && <Tag tone="ok">免費取消</Tag>}
            </div>
          </div>

          <section className="mt-4">
            <h3 className="mb-2 text-sm font-semibold">前往預訂</h3>
            <div className="grid grid-cols-2 gap-2">
              {offer.deepLinks.map((l) => (
                <a
                  key={l.label}
                  href={l.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-11 items-center justify-center rounded-xl border border-gray-200 bg-white text-sm font-medium tap"
                >
                  {l.label} ↗
                </a>
              ))}
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-gray-400">以相同日期與人數開啟訂房網站搜尋，實際房價、房型與取消政策以該網站為準。</p>
          </section>
        </>
      )}
    </Sheet>
  );
}
