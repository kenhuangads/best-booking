'use client';

import { airlineName } from '@/lib/airlines';
import { airportLabel } from '@/lib/airports';
import { fmtDateFull, fmtDuration, fmtPrice, fmtTime } from '@/lib/format';
import { CABIN_LABEL, type FlightOffer, type FlightSearchParams } from '@/lib/types';
import { Sheet } from './Sheet';
import { PrimaryButton } from './ui';

function layoverMinutes(arrive: string, depart: string): number {
  return Math.round((Date.parse(depart + ':00Z') - Date.parse(arrive + ':00Z')) / 60000);
}

export function FlightDetailSheet({
  offer,
  params,
  onClose,
  onWatch,
}: {
  offer: FlightOffer | null;
  params: FlightSearchParams;
  onClose: () => void;
  onWatch: (offer: FlightOffer) => void;
}) {
  const pax = [`${params.adults} 成人`, params.children ? `${params.children} 兒童` : '', params.infants ? `${params.infants} 嬰兒` : ''].filter(Boolean).join(' ');
  return (
    <Sheet
      open={!!offer}
      onClose={onClose}
      title="航班詳情"
      footer={
        offer && (
          <div className="flex gap-2">
            <PrimaryButton variant="secondary" onClick={() => onWatch(offer)} className="flex-1">
              🔔 追蹤此航空
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
          <div className="rounded-2xl bg-brand-50 p-4">
            <div className="text-xs text-brand-700">
              總價 · {pax} · {CABIN_LABEL[params.cabin]}
            </div>
            <div className="mt-0.5 text-3xl font-bold text-brand-700">{fmtPrice(offer.price, offer.currency)}</div>
            <div className="mt-0.5 text-xs text-gray-500">
              每位成人 {fmtPrice(offer.pricePerAdult, offer.currency)}
              {offer.baggageIncluded === true ? ' · 含託運行李' : offer.baggageIncluded === false ? ' · 不含託運行李' : ''}
              {offer.seatsLeft != null && offer.seatsLeft <= 9 ? ` · 剩 ${offer.seatsLeft} 位` : ''}
            </div>
          </div>

          {offer.itineraries.map((it, i) => (
            <section key={i} className="mt-4">
              <h3 className="mb-2 flex items-center justify-between text-sm font-semibold">
                <span>
                  {offer.itineraries.length > 1 ? (i === 0 ? '去程' : '回程') : '航班'} · {fmtDateFull(it.segments[0].departAt.slice(0, 10))}
                </span>
                <span className="text-xs font-normal text-gray-500">
                  {fmtDuration(it.durationMin)} · {it.stops ? `轉機 ${it.stops} 次` : '直飛'}
                </span>
              </h3>
              <ol className="space-y-2">
                {it.segments.map((s, j) => (
                  <li key={j}>
                    <div className="rounded-xl border border-gray-200 p-3">
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>
                          {airlineName(s.carrier)} {s.flightNumber}
                          {s.operatingCarrier && s.operatingCarrier !== s.carrier ? `（由 ${airlineName(s.operatingCarrier)} 營運）` : ''}
                        </span>
                        <span>{s.aircraft ?? ''}</span>
                      </div>
                      <div className="mt-2 flex items-center gap-3">
                        <div className="w-16">
                          <div className="text-lg font-semibold tabular-nums">{fmtTime(s.departAt)}</div>
                          <div className="text-xs text-gray-500">{airportLabel(s.from)}</div>
                        </div>
                        <div className="flex-1 text-center text-[11px] text-gray-400">
                          {fmtDuration(s.durationMin)}
                          <div className="my-1 h-px bg-gray-300" />
                        </div>
                        <div className="w-16 text-right">
                          <div className="text-lg font-semibold tabular-nums">{fmtTime(s.arriveAt)}</div>
                          <div className="text-xs text-gray-500">{airportLabel(s.to)}</div>
                        </div>
                      </div>
                    </div>
                    {j < it.segments.length - 1 && (
                      <div className="my-1 text-center text-[11px] text-orange-600">
                        於 {airportLabel(s.to)} 轉機 · 停留 {fmtDuration(layoverMinutes(s.arriveAt, it.segments[j + 1].departAt))}
                      </div>
                    )}
                  </li>
                ))}
              </ol>
            </section>
          ))}

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
            <p className="mt-2 text-[11px] leading-relaxed text-gray-400">以相同條件開啟比價 / 訂票網站，實際票價與座位以該網站為準。</p>
          </section>
        </>
      )}
    </Sheet>
  );
}
