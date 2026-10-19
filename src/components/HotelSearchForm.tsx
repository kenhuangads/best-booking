'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getCity, POPULAR_CITIES } from '@/lib/cities';
import { loadLocal, saveLocal } from '@/lib/client';
import { addDays, diffDays, fmtDate, todayISO } from '@/lib/format';
import { hotelParamsToQuery } from '@/lib/schemas';
import type { HotelSearchParams } from '@/lib/types';
import { CityPicker } from './CityPicker';
import { DatePicker } from './DatePicker';
import { GuestPicker } from './PaxPicker';
import { FieldButton, PrimaryButton } from './ui';

interface FormState {
  city: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  rooms: number;
  /** 指定飯店名稱（選填） */
  keyword: string;
}

const KEY = 'bb:hotelForm';

function defaults(): FormState {
  const checkIn = addDays(todayISO(), 21);
  return { city: 'TYO', checkIn, checkOut: addDays(checkIn, 3), adults: 2, rooms: 1, keyword: '' };
}

export function HotelSearchForm() {
  const router = useRouter();
  const [f, setF] = useState<FormState>(defaults);
  const [sheet, setSheet] = useState<null | 'city' | 'dates' | 'guests'>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const saved = loadLocal<FormState>(KEY, defaults());
    if (saved.checkIn < todayISO()) {
      const d = defaults();
      saved.checkIn = d.checkIn;
      saved.checkOut = d.checkOut;
    }
    if (saved.checkOut <= saved.checkIn) saved.checkOut = addDays(saved.checkIn, 3);
    setF(saved);
  }, []);

  const update = (patch: Partial<FormState>) => setF((x) => ({ ...x, ...patch }));
  const city = getCity(f.city);
  const nights = diffDays(f.checkIn, f.checkOut);

  const submit = () => {
    const params: HotelSearchParams = {
      city: f.city,
      checkIn: f.checkIn,
      checkOut: f.checkOut,
      adults: f.adults,
      rooms: f.rooms,
      keyword: f.keyword.trim() || undefined,
    };
    saveLocal(KEY, f);
    setSubmitting(true);
    router.push(`/search?${hotelParamsToQuery(params)}`);
  };

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-2xl border border-gray-200">
        <FieldButton
          label="目的地"
          value={
            city ? (
              <span>
                {city.name} <span className="text-sm font-normal text-gray-400">{city.country}</span>
              </span>
            ) : (
              f.city
            )
          }
          onClick={() => setSheet('city')}
        />
        <div className="flex border-t border-gray-200">
          <FieldButton label="入住" value={fmtDate(f.checkIn)} onClick={() => setSheet('dates')} className="flex-1" />
          <div className="flex items-center px-1 text-xs text-gray-400">{nights} 晚</div>
          <FieldButton label="退房" value={fmtDate(f.checkOut)} onClick={() => setSheet('dates')} className="flex-1" align="right" />
        </div>
        <div className="border-t border-gray-200">
          <FieldButton label="房間 · 人數" value={`${f.rooms} 房 · ${f.adults} 位成人`} onClick={() => setSheet('guests')} />
        </div>
        <label className="flex min-h-[64px] flex-col justify-center border-t border-gray-200 px-4 py-2">
          <span className="text-xs text-gray-500">指定飯店（選填）</span>
          <span className="mt-0.5 flex items-center">
            <input
              value={f.keyword}
              onChange={(e) => update({ keyword: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submit();
              }}
              placeholder="例：京王廣場、礁溪老爺"
              maxLength={80}
              enterKeyHint="search"
              className="min-w-0 flex-1 bg-transparent text-base font-semibold outline-none placeholder:font-normal placeholder:text-gray-400"
            />
            {f.keyword && (
              <button
                type="button"
                aria-label="清除飯店名稱"
                onClick={() => update({ keyword: '' })}
                className="ml-2 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500 tap"
              >
                ×
              </button>
            )}
          </span>
        </label>
      </div>

      <PrimaryButton onClick={submit} loading={submitting} className="h-14">
        {f.keyword.trim() ? '🔍 搜尋這間飯店' : '🔍 搜尋最低房價'}
      </PrimaryButton>

      <div>
        <div className="mb-2 text-xs font-semibold text-gray-500">熱門目的地</div>
        <div className="-mx-3 flex gap-2 overflow-x-auto px-3 pb-1 no-scrollbar">
          {POPULAR_CITIES.map((key) => {
            const c = getCity(key);
            if (!c) return null;
            return (
              <button
                key={key}
                type="button"
                onClick={() => update({ city: key })}
                className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium tap ${
                  f.city === key ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-gray-200 bg-white text-gray-700'
                }`}
              >
                {c.name}
              </button>
            );
          })}
        </div>
      </div>

      <CityPicker open={sheet === 'city'} onClose={() => setSheet(null)} onSelect={(key) => update({ city: key })} />
      <DatePicker
        open={sheet === 'dates'}
        onClose={() => setSheet(null)}
        mode="range"
        start={f.checkIn}
        end={f.checkOut}
        startLabel="入住"
        endLabel="退房"
        unit="晚"
        farNote={{ afterDays: 180, text: '入住日超過 6 個月，部分飯店可能還沒開放訂房，查不到房價是正常的' }}
        onConfirm={({ start, end }) => update({ checkIn: start, checkOut: end ?? addDays(start, 1) })}
      />
      <GuestPicker open={sheet === 'guests'} onClose={() => setSheet(null)} value={{ adults: f.adults, rooms: f.rooms }} onChange={(v) => update(v)} />
    </div>
  );
}
