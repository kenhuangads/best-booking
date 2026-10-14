/**
 * Travelpayouts（Aviasales Data API）：免費、額度大（每分鐘 600 次），
 * 但給的是「過去 48 小時內有人在 Aviasales 查到的最低價」，不是即時價。
 * 適合當追蹤用的價格雷達與價格日曆；發現低價後再用 SerpApi 確認。
 * 文件：https://support.travelpayouts.com/hc/en-us/articles/203956163
 */
import { env } from '../env';
import { addMinutesLocal, tzOffset } from '../tz';
import type { CalendarDay, FlightOffer, FlightSearchParams, Itinerary } from '../types';

interface TpTicket {
  origin: string;
  destination: string;
  origin_airport?: string;
  destination_airport?: string;
  price: number;
  airline: string;
  flight_number?: string;
  departure_at: string;
  return_at?: string;
  transfers?: number;
  return_transfers?: number;
  duration?: number;
  duration_to?: number;
  duration_back?: number;
  link?: string;
}
interface TpResp<T> {
  success: boolean;
  data?: T;
  error?: string;
}

type Params = Record<string, string | number | boolean | undefined>;

async function tpGet<T>(path: string, params: Params): Promise<T | undefined> {
  const { token, endpoint } = env.travelpayouts;
  if (!token) throw new Error('尚未設定 TRAVELPAYOUTS_TOKEN');
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== '') sp.set(k, String(v));
  const res = await fetch(`${endpoint}/${path}?${sp}`, { headers: { 'X-Access-Token': token }, cache: 'no-store' });
  const j = (await res.json().catch(() => null)) as TpResp<T> | null;
  if (res.status === 401 || res.status === 403) throw new Error('Travelpayouts token 無效，請檢查 TRAVELPAYOUTS_TOKEN');
  if (res.status === 429) throw new Error('Travelpayouts 請求過於頻繁，請稍後再試');
  if (!res.ok || !j) throw new Error(`Travelpayouts 錯誤 ${res.status}`);
  if (!j.success) throw new Error(`Travelpayouts：${j.error ?? '查詢失敗'}`);
  return j.data;
}

/** 快取依「市場」分（美國站、俄國站…），台灣出發沒有專屬市場，依序試到有資料為止 */
async function tryMarkets<T>(path: string, params: Params, isEmpty: (d: T | undefined) => boolean): Promise<{ data: T | undefined; market: string }> {
  let lastErr: unknown = null;
  for (const market of env.travelpayouts.markets) {
    try {
      const data = await tpGet<T>(path, { ...params, market });
      if (!isEmpty(data)) return { data, market };
    } catch (e) {
      lastErr = e;
    }
  }
  if (lastErr) throw lastErr;
  return { data: undefined, market: env.travelpayouts.markets[0] };
}

/* ───────────── 匯率（Travelpayouts 以美元查價，換算成台幣） ───────────── */

let rateCache: { rate: number; at: number } | null = null;
const FALLBACK_USD_TWD = 32;

export async function usdToTwdRate(): Promise<number> {
  if (env.travelpayouts.currency === 'twd') return 1;
  if (rateCache && Date.now() - rateCache.at < 12 * 60 * 60 * 1000) return rateCache.rate;
  try {
    const r = await fetch('https://open.er-api.com/v6/latest/USD', { cache: 'no-store' });
    const j = (await r.json()) as { rates?: Record<string, number> };
    const rate = j.rates?.TWD;
    if (rate && rate > 15 && rate < 60) {
      rateCache = { rate, at: Date.now() };
      return rate;
    }
  } catch {
    /* 用備援匯率 */
  }
  return rateCache?.rate ?? FALLBACK_USD_TWD;
}

/* ───────────── 機票 ───────────── */

function leg(from: string, to: string, departIso: string, durationMin: number, stops: number, airline: string, flightNumber?: string): Itinerary {
  const departAt = departIso.slice(0, 16);
  const arriveAt = addMinutesLocal(departAt, durationMin + (tzOffset(to) - tzOffset(from)) * 60);
  return {
    segments: [
      {
        from,
        to,
        departAt,
        arriveAt,
        carrier: airline,
        flightNumber: flightNumber ? `${airline}${flightNumber}` : airline,
        durationMin,
      },
    ],
    durationMin,
    stops,
  };
}

function toOffer(t: TpTicket, p: FlightSearchParams, rate: number, market: string): FlightOffer {
  const perAdult = Math.round((t.price * rate) / 10) * 10;
  const price = perAdult * p.adults + Math.round(perAdult * 0.75) * p.children + Math.round(perAdult * 0.1) * p.infants;
  const from = t.origin_airport || p.from;
  const to = t.destination_airport || p.to;
  const itineraries = [leg(from, to, t.departure_at, t.duration_to ?? t.duration ?? 0, t.transfers ?? 0, t.airline, t.flight_number)];
  if (t.return_at) itineraries.push(leg(to, from, t.return_at, t.duration_back ?? 0, t.return_transfers ?? 0, t.airline));
  const host = market === 'ru' ? 'https://www.aviasales.ru' : 'https://www.aviasales.com';
  const marker = env.travelpayouts.marker ? `${t.link?.includes('?') ? '&' : '?'}marker=${encodeURIComponent(env.travelpayouts.marker)}` : '';
  return {
    id: `tp-${t.airline}${t.flight_number ?? ''}-${t.departure_at.slice(0, 16)}-${t.return_at?.slice(0, 16) ?? ''}`,
    kind: 'flight',
    price,
    currency: 'TWD',
    pricePerAdult: perAdult,
    itineraries,
    carriers: [t.airline],
    validatingCarrier: t.airline,
    approximate: true,
    source: 'travelpayouts',
    deepLinks: t.link ? [{ kind: 'other', label: 'Aviasales', url: `${host}${t.link}${marker}` }] : [],
  };
}

export async function searchFlightsTravelpayouts(p: FlightSearchParams): Promise<FlightOffer[]> {
  const rate = await usdToTwdRate();
  const { data, market } = await tryMarkets<TpTicket[]>(
    'prices_for_dates',
    {
      origin: p.from,
      destination: p.to,
      departure_at: p.departDate,
      return_at: p.returnDate,
      one_way: p.returnDate ? 'false' : 'true',
      direct: p.nonStop ? 'true' : 'false',
      currency: env.travelpayouts.currency,
      sorting: 'price',
      limit: p.carriers?.length ? 200 : 50,
      unique: 'false',
    },
    (d) => !d || d.length === 0,
  );
  return (data ?? [])
    .filter((t) => t.price > 0 && t.departure_at)
    .map((t) => toOffer(t, p, rate, market))
    .sort((a, b) => a.price - b.price);
}

/* ───────────── 價格日曆 ───────────── */

function nextMonth(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export async function priceCalendarTravelpayouts(from: string, to: string, month: string, tripLength: number | null, nonStop = false): Promise<CalendarDay[]> {
  const rate = await usdToTwdRate();
  const base: Params = {
    origin: from,
    destination: to,
    group_by: 'departure_at',
    departure_at: month,
    direct: nonStop ? 'true' : 'false',
    currency: env.travelpayouts.currency,
  };
  const best = new Map<string, number>();
  const merge = (data?: Record<string, TpTicket>) => {
    for (const [date, t] of Object.entries(data ?? {})) {
      if (!t?.price) continue;
      const price = Math.round((t.price * rate) / 10) * 10;
      const prev = best.get(date);
      if (prev == null || price < prev) best.set(date, price);
    }
  };
  const isEmpty = (d: Record<string, TpTicket> | undefined) => !d || Object.keys(d).length === 0;
  if (tripLength == null) {
    merge((await tryMarkets<Record<string, TpTicket>>('grouped_prices', base, isEmpty)).data);
  } else {
    // 回程可能落在下個月，兩個月各查一次取最低
    for (const retMonth of [month, nextMonth(month)]) {
      merge(
        (await tryMarkets<Record<string, TpTicket>>('grouped_prices', { ...base, return_at: retMonth, min_trip_duration: tripLength, max_trip_duration: tripLength }, isEmpty)).data,
      );
    }
  }
  const [y, m] = month.split('-').map(Number);
  const last = new Date(y, m, 0).getDate();
  return Array.from({ length: last }, (_, i) => {
    const date = `${month}-${String(i + 1).padStart(2, '0')}`;
    return { date, price: best.get(date) ?? null };
  });
}
