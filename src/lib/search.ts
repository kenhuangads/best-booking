import { flightDeepLinks, hotelDeepLinks } from './deeplinks';
import { env, errMsg } from './env';
import { priceCalendarAmadeus, searchFlightsAmadeus, searchHotelsAmadeus } from './providers/amadeus';
import { priceCalendarDemo, searchFlightsDemo, searchHotelsDemo } from './providers/demo';
import { searchFlightsSerpApi, searchHotelsSerpApi } from './providers/serpapi';
import type {
  Cabin,
  CalendarResponse,
  DeepLink,
  FlightOffer,
  FlightSearchParams,
  HotelOffer,
  HotelSearchParams,
  Offer,
  ProviderName,
  SearchResponse,
} from './types';

/* 簡單的記憶體快取，避免短時間內重複呼叫供應商 */
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

const DEMO_WARNING = '目前使用示範資料，價格為模擬值；設定 SerpApi 金鑰後即可查詢 Google 即時價格。';

/** 供應商自帶的連結優先（例如 SerpApi 的 Google 航班精確搜尋頁），同類型的通用連結就不再重複 */
function mergeLinks(own: DeepLink[], generic: DeepLink[]): DeepLink[] {
  return [...own, ...generic.filter((g) => !own.some((o) => o.kind === g.kind && o.kind !== 'airline' && o.kind !== 'other'))];
}

export function calendarSupported(provider: ProviderName = env.flightProvider): boolean {
  return provider !== 'serpapi';
}

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
  const raw =
    provider === 'serpapi' ? await searchFlightsSerpApi(p) : provider === 'amadeus' ? await searchFlightsAmadeus(p) : await searchFlightsDemo(p);
  const links = flightDeepLinks(p);
  const offers = raw
    .filter((o) => !p.nonStop || o.itineraries.every((i) => i.stops === 0))
    .filter((o) => !p.carriers?.length || o.carriers.every((c) => p.carriers!.includes(c)))
    .map((o) => ({ ...o, deepLinks: mergeLinks(o.deepLinks, links) }))
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
  const raw =
    provider === 'serpapi' ? await searchHotelsSerpApi(p) : provider === 'amadeus' ? await searchHotelsAmadeus(p) : await searchHotelsDemo(p);
  const offers = raw
    .filter((o) => !p.hotelName || o.name === p.hotelName)
    .map((o) => ({ ...o, deepLinks: mergeLinks(hotelDeepLinks(p, o.name), o.deepLinks) }))
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

export async function priceCalendar(
  from: string,
  to: string,
  month: string,
  tripLength: number | null,
  cabin: Cabin,
  carriers?: string[],
): Promise<CalendarResponse> {
  const key = `c:${from}:${to}:${month}:${tripLength ?? ''}:${cabin}:${carriers?.join(',') ?? ''}`;
  const hit = getCached<CalendarResponse>(key, 10 * 60 * 1000);
  if (hit) return hit;
  const provider = env.flightProvider;
  let res: CalendarResponse;
  if (!calendarSupported(provider)) {
    // 每天各查一次會很快用完 SerpApi 額度，所以不提供
    const [y, m] = month.split('-').map(Number);
    const last = new Date(y, m, 0).getDate();
    const days = Array.from({ length: last }, (_, i) => ({ date: `${month}-${String(i + 1).padStart(2, '0')}`, price: null }));
    return { month, days, provider, tripLength, currency: 'TWD', warnings: ['使用 Google 即時價格時，價格日曆暫不提供'] };
  }
  if (provider === 'amadeus') {
    try {
      const r = await priceCalendarAmadeus(from, to, month, tripLength);
      const warnings: string[] = [];
      if (cabin !== 'ECONOMY') warnings.push('價格日曆僅提供經濟艙參考價');
      if (carriers?.length) warnings.push('價格日曆無法依航空公司篩選，顯示的是所有航空公司的最低價');
      res = { month, days: r.days, provider, tripLength, currency: r.currency, warnings };
    } catch (e) {
      const days = await priceCalendarDemo(from, to, month, tripLength, cabin, carriers);
      res = { month, days, provider: 'demo', tripLength, currency: 'TWD', warnings: [`Amadeus 價格日曆暫無此航線資料（${errMsg(e)}），以下為示範估算`] };
    }
  } else {
    const days = await priceCalendarDemo(from, to, month, tripLength, cabin, carriers);
    res = { month, days, provider, tripLength, currency: 'TWD', warnings: [DEMO_WARNING] };
  }
  setCached(key, res);
  return res;
}

export function offerPrice(o: Offer): number {
  return o.kind === 'flight' ? o.price : o.totalPrice;
}
