import { flightDeepLinks, hotelDeepLinks } from './deeplinks';
import { env, errMsg } from './env';
import { priceCalendarAmadeus, searchFlightsAmadeus, searchHotelsAmadeus } from './providers/amadeus';
import { priceCalendarDemo, searchFlightsDemo, searchHotelsDemo } from './providers/demo';
import type { Cabin, CalendarResponse, FlightOffer, FlightSearchParams, HotelOffer, HotelSearchParams, Offer, SearchResponse } from './types';

/* 簡單的記憶體快取，避免短時間內重複呼叫供應商（Amadeus 免費額度有限） */
const cache = new Map<string, { at: number; value: unknown }>();
const TTL_MS = 2 * 60 * 1000;

function getCached<T>(key: string, ttl = TTL_MS): T | null {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < ttl) return hit.value as T;
  if (hit) cache.delete(key);
  return null;
}

function setCached(key: string, value: unknown): void {
  if (cache.size > 300) {
    const oldest = cache.keys().next().value;
    if (oldest) cache.delete(oldest);
  }
  cache.set(key, { at: Date.now(), value });
}

const DEMO_WARNING = '目前使用示範資料，價格為模擬值；設定 Amadeus 金鑰後即可查詢真實報價。';

export interface SearchOptions {
  bypassCache?: boolean;
}

export async function searchFlights(p: FlightSearchParams, opts: SearchOptions = {}): Promise<SearchResponse<FlightOffer>> {
  const key = 'f:' + JSON.stringify(p);
  if (!opts.bypassCache) {
    const hit = getCached<SearchResponse<FlightOffer>>(key);
    if (hit) return { ...hit, cached: true };
  }
  const provider = env.flightProvider;
  const raw = provider === 'amadeus' ? await searchFlightsAmadeus(p) : await searchFlightsDemo(p);
  const links = flightDeepLinks(p);
  const offers = raw
    .filter((o) => !p.nonStop || o.itineraries.every((i) => i.stops === 0))
    .filter((o) => !p.carrier || o.carriers.includes(p.carrier))
    .map((o) => ({ ...o, deepLinks: links }))
    .sort((a, b) => a.price - b.price);
  const res: SearchResponse<FlightOffer> = {
    offers,
    provider,
    fetchedAt: new Date().toISOString(),
    cached: false,
    warnings: provider === 'demo' ? [DEMO_WARNING] : [],
  };
  setCached(key, res);
  return res;
}

export async function searchHotels(p: HotelSearchParams, opts: SearchOptions = {}): Promise<SearchResponse<HotelOffer>> {
  const key = 'h:' + JSON.stringify(p);
  if (!opts.bypassCache) {
    const hit = getCached<SearchResponse<HotelOffer>>(key);
    if (hit) return { ...hit, cached: true };
  }
  const provider = env.hotelProvider;
  const raw = provider === 'amadeus' ? await searchHotelsAmadeus(p) : await searchHotelsDemo(p);
  const offers = raw
    .filter((o) => !p.hotelName || o.name === p.hotelName)
    .map((o) => ({ ...o, deepLinks: hotelDeepLinks(p, o.name) }))
    .sort((a, b) => a.totalPrice - b.totalPrice);
  const res: SearchResponse<HotelOffer> = {
    offers,
    provider,
    fetchedAt: new Date().toISOString(),
    cached: false,
    warnings: provider === 'demo' ? [DEMO_WARNING] : [],
  };
  setCached(key, res);
  return res;
}

export async function priceCalendar(from: string, to: string, month: string, tripLength: number | null, cabin: Cabin): Promise<CalendarResponse> {
  const key = `c:${from}:${to}:${month}:${tripLength ?? ''}:${cabin}`;
  const hit = getCached<CalendarResponse>(key, 10 * 60 * 1000);
  if (hit) return hit;
  const provider = env.flightProvider;
  let res: CalendarResponse;
  if (provider === 'amadeus') {
    try {
      const r = await priceCalendarAmadeus(from, to, month, tripLength);
      res = { month, days: r.days, provider, tripLength, currency: r.currency, warnings: cabin !== 'ECONOMY' ? ['價格日曆僅提供經濟艙參考價'] : [] };
    } catch (e) {
      const days = await priceCalendarDemo(from, to, month, tripLength, cabin);
      res = { month, days, provider: 'demo', tripLength, currency: 'TWD', warnings: [`Amadeus 價格日曆暫無此航線資料（${errMsg(e)}），以下為示範估算`] };
    }
  } else {
    const days = await priceCalendarDemo(from, to, month, tripLength, cabin);
    res = { month, days, provider, tripLength, currency: 'TWD', warnings: [DEMO_WARNING] };
  }
  setCached(key, res);
  return res;
}

export function offerPrice(o: Offer): number {
  return o.kind === 'flight' ? o.price : o.totalPrice;
}
