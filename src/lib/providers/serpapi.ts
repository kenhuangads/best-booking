/**
 * SerpApi：抓取 Google 航班 / Google 飯店的即時價格（https://serpapi.com）
 * - 免費方案每月約 250 次搜尋；相同條件 1 小時內重複查詢走 SerpApi 快取，不扣額度。
 * - Google 航班的來回票只回傳去程班次與來回總價，回程班次需在預訂網站選擇。
 */
import { getCity } from '../cities';
import { env } from '../env';
import { diffDays } from '../format';
import type { Cabin, FlightOffer, FlightSearchParams, FlightSegment, HotelOffer, HotelSearchParams } from '../types';

type Params = Record<string, string | number | boolean | undefined>;

async function serpGet<T extends object>(params: Params): Promise<Partial<T>> {
  const { key, endpoint } = env.serpapi;
  if (!key) throw new Error('尚未設定 SERPAPI_KEY');
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== '') sp.set(k, String(v));
  sp.set('api_key', key);
  const res = await fetch(`${endpoint}?${sp}`, { cache: 'no-store' });
  const j = (await res.json().catch(() => ({}))) as Partial<T> & { error?: string };
  if (j.error) {
    // 查無結果不算錯誤
    if (/hasn.t returned any results|no results/i.test(j.error)) return {};
    if (res.status === 429 || /run out of searches/i.test(j.error)) throw new Error('SerpApi 本月搜尋額度已用完，下個月會重置，或到 serpapi.com 升級方案');
    if (res.status === 401 || /invalid api key/i.test(j.error)) throw new Error('SerpApi 金鑰無效，請檢查 SERPAPI_KEY');
    throw new Error(`SerpApi：${j.error}`);
  }
  if (!res.ok) throw new Error(`SerpApi 錯誤 ${res.status}`);
  return j;
}

/* ───────────── 帳戶額度（Account API 免費，不扣額度） ───────────── */

export interface SerpAccount {
  quota: number;
  used: number;
  left: number;
}

let accountCache: { at: number; value: SerpAccount | null } | null = null;

export async function serpAccount(): Promise<SerpAccount | null> {
  const { key, endpoint } = env.serpapi;
  if (!key) return null;
  if (accountCache && Date.now() - accountCache.at < 10 * 60 * 1000) return accountCache.value;
  let value: SerpAccount | null = null;
  try {
    const base = endpoint.replace(/\/search(\.json)?$/, '');
    const r = await fetch(`${base}/account.json?api_key=${encodeURIComponent(key)}`, { cache: 'no-store' });
    const j = (await r.json().catch(() => ({}))) as {
      searches_per_month?: number;
      this_month_usage?: number;
      total_searches_left?: number;
      plan_searches_left?: number;
    };
    if (r.ok && typeof j.searches_per_month === 'number') {
      value = {
        quota: j.searches_per_month,
        used: j.this_month_usage ?? 0,
        left: j.total_searches_left ?? j.plan_searches_left ?? Math.max(0, j.searches_per_month - (j.this_month_usage ?? 0)),
      };
    }
  } catch {
    /* 查不到就用預設額度 */
  }
  accountCache = { at: Date.now(), value };
  return value;
}

/* ───────────── 機票 ───────────── */

interface SerpAirport {
  id: string;
  time: string;
}
interface SerpFlightSeg {
  departure_airport: SerpAirport;
  arrival_airport: SerpAirport;
  duration?: number;
  airplane?: string;
  flight_number?: string;
}
interface SerpFlightItem {
  flights?: SerpFlightSeg[];
  layovers?: { duration?: number }[];
  total_duration?: number;
  price?: number;
}
interface SerpFlightsResp {
  best_flights: SerpFlightItem[];
  other_flights: SerpFlightItem[];
  search_metadata: { google_flights_url?: string };
}

const TRAVEL_CLASS: Record<Cabin, number> = { ECONOMY: 1, PREMIUM_ECONOMY: 2, BUSINESS: 3, FIRST: 4 };
/** "2026-11-04 08:30" → "2026-11-04T08:30" */
const toLocal = (t: string) => t.replace(' ', 'T').slice(0, 16);

export async function searchFlightsSerpApi(p: FlightSearchParams): Promise<FlightOffer[]> {
  const r = await serpGet<SerpFlightsResp>({
    engine: 'google_flights',
    departure_id: p.from,
    arrival_id: p.to,
    outbound_date: p.departDate,
    return_date: p.returnDate,
    type: p.returnDate ? 1 : 2,
    travel_class: TRAVEL_CLASS[p.cabin],
    adults: p.adults,
    children: p.children || undefined,
    infants_on_lap: p.infants || undefined,
    stops: p.nonStop ? 1 : undefined,
    include_airlines: p.carriers?.join(','),
    currency: 'TWD',
    hl: 'zh-TW',
    gl: 'tw',
  });
  const googleUrl = r.search_metadata?.google_flights_url;
  const seats = Math.max(1, p.adults + p.children);
  const seen = new Set<string>();
  const out: FlightOffer[] = [];

  for (const it of [...(r.best_flights ?? []), ...(r.other_flights ?? [])]) {
    if (!it.price || !it.flights?.length) continue;
    const segments: FlightSegment[] = it.flights.map((f) => {
      const fn = (f.flight_number ?? '').trim();
      return {
        from: f.departure_airport.id,
        to: f.arrival_airport.id,
        departAt: toLocal(f.departure_airport.time),
        arriveAt: toLocal(f.arrival_airport.time),
        carrier: fn.split(/\s+/)[0] ?? '',
        flightNumber: fn.replace(/\s+/g, ''),
        durationMin: f.duration ?? 0,
        aircraft: f.airplane,
      };
    });
    // 同一組班機可能同時出現在 best_flights 與 other_flights
    const key = segments.map((s) => `${s.flightNumber}@${s.departAt}`).join('|');
    if (seen.has(key)) continue;
    seen.add(key);
    const layover = (it.layovers ?? []).reduce((sum, l) => sum + (l.duration ?? 0), 0);
    const durationMin = it.total_duration ?? segments.reduce((sum, s) => sum + s.durationMin, 0) + layover;
    const carriers = [...new Set(segments.map((s) => s.carrier).filter(Boolean))];
    out.push({
      id: `serp-${key}`,
      kind: 'flight',
      price: Math.round(it.price),
      currency: 'TWD',
      pricePerAdult: Math.round(it.price / seats),
      itineraries: [{ segments, durationMin, stops: segments.length - 1 }],
      carriers,
      validatingCarrier: carriers[0],
      returnPending: !!p.returnDate,
      source: 'serpapi',
      deepLinks: googleUrl ? [{ kind: 'google', label: 'Google 航班', url: googleUrl }] : [],
    });
  }
  return out.sort((a, b) => a.price - b.price);
}

/* ───────────── 住宿 ───────────── */

interface SerpRate {
  extracted_lowest?: number;
}
interface SerpProperty {
  type?: string;
  name?: string;
  link?: string;
  property_token?: string;
  gps_coordinates?: { latitude?: number; longitude?: number };
  rate_per_night?: SerpRate;
  total_rate?: SerpRate;
  prices?: { free_cancellation?: boolean }[];
  hotel_class?: string;
  extracted_hotel_class?: number;
  overall_rating?: number;
  reviews?: number;
  amenities?: string[];
}
interface SerpHotelsResp extends SerpProperty {
  properties: SerpProperty[];
}

function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(s));
}

export async function searchHotelsSerpApi(p: HotelSearchParams): Promise<HotelOffer[]> {
  const city = getCity(p.city);
  if (!city) throw new Error('不支援的目的地');
  const nights = Math.max(1, diffDays(p.checkIn, p.checkOut));
  const r = await serpGet<SerpHotelsResp>({
    engine: 'google_hotels',
    q: p.hotelName ? `${p.hotelName} ${city.searchName}` : p.keyword ? `${p.keyword} ${city.searchName}` : `${city.searchName} 飯店`,
    check_in_date: p.checkIn,
    check_out_date: p.checkOut,
    // Google 飯店不分房數：以每房人數查詢，總價再乘上房數
    adults: Math.max(1, Math.ceil(p.adults / p.rooms)),
    currency: 'TWD',
    hl: 'zh-TW',
    gl: 'tw',
    // 用名稱找飯店時依相關度排序，才不會被附近較便宜的飯店擠下去
    sort_by: p.hotelName || p.keyword ? undefined : 3,
    // 有飯店編號就直接查那一間
    property_token: p.propertyToken,
  });

  // 查詢剛好對到單一飯店時，SerpApi 會把飯店資料直接放在最上層
  const list: SerpProperty[] = r.properties ?? (r.name ? [r as SerpProperty] : []);
  const out: HotelOffer[] = [];
  for (const h of list) {
    if (!h.name || /vacation/i.test(h.type ?? '')) continue;
    const perNight = h.rate_per_night?.extracted_lowest;
    const stayOneRoom = h.total_rate?.extracted_lowest ?? (perNight != null ? perNight * nights : undefined);
    if (stayOneRoom == null) continue;
    const lat = h.gps_coordinates?.latitude;
    const lng = h.gps_coordinates?.longitude;
    const stars = h.extracted_hotel_class ?? (h.hotel_class ? parseInt(h.hotel_class, 10) || undefined : undefined);
    out.push({
      id: `serp-${h.property_token ?? h.name}`,
      kind: 'hotel',
      name: h.name,
      stars,
      rating: h.overall_rating,
      reviewCount: h.reviews,
      distanceKm: lat != null && lng != null ? Math.round(distanceKm(city, { lat, lng }) * 10) / 10 : undefined,
      pricePerNight: Math.round(stayOneRoom / nights),
      totalPrice: Math.round(stayOneRoom * p.rooms),
      currency: 'TWD',
      nights,
      breakfast: h.amenities?.some((a) => /免費早餐|早餐免費|free breakfast/i.test(a)) || undefined,
      freeCancel: h.prices?.some((x) => x.free_cancellation) || undefined,
      lat,
      lng,
      propertyToken: h.property_token,
      source: 'serpapi',
      deepLinks: h.link ? [{ kind: 'other', label: '飯店官網', url: h.link }] : [],
    });
  }
  // 保留 Google 的順序（用名稱搜尋時是相關度），價格排序交給 search.ts
  return out;
}
