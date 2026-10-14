/**
 * 示範資料供應商：不需任何 API 金鑰即可運作。
 * 價格以路線距離、航空公司類型、艙等、星期、連假、提前天數等因素推算，
 * 並加入每 5 分鐘變動一次的「市場波動」，讓追蹤 / 通知功能能實際看到價格變化。
 * 所有結果以搜尋條件為種子決定，同樣條件會得到一致的航班組合。
 */
import { AIRLINES, routeAirlineCodes, type AirlineTier } from '../airlines';
import { getAirport, type Airport, type Region } from '../airports';
import { getCity } from '../cities';
import { addDays, diffDays, parseISO, todayISO } from '../format';
import { inLongWeekend, overlapsLongWeekend } from '../holidays';
import type {
  Cabin,
  CalendarDay,
  FlightOffer,
  FlightSearchParams,
  FlightSegment,
  HotelOffer,
  HotelSearchParams,
  Itinerary,
} from '../types';

/* ───────────── 亂數工具 ───────────── */

function hash(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rngFor = (key: string) => mulberry32(hash(key));

/** 模擬市場波動：每小時一個慢速因子、每 5 分鐘一個快速因子 */
function liveFactor(key: string): number {
  const slow = Math.floor(Date.now() / (60 * 60 * 1000));
  const fast = Math.floor(Date.now() / (5 * 60 * 1000));
  const s = rngFor(`${key}:slow:${slow}`)();
  const f = rngFor(`${key}:fast:${fast}`)();
  return (0.95 + s * 0.1) * (0.97 + f * 0.06);
}

/* ───────────── 地理 / 時間 ───────────── */

function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

const TZ_BY_CODE: Record<string, number> = {
  BKK: 7, DMK: 7, CNX: 7, HKT: 7, HAN: 7, SGN: 7, DAD: 7, CXR: 7, PQC: 7, CGK: 7, PNH: 7, REP: 7,
  RGN: 6.5, DPS: 8, BWN: 8,
  LHR: 0, LGW: 0, LIS: 0, IST: 3, HEL: 2,
  LAX: -8, SFO: -8, SEA: -8, YVR: -8, JFK: -5, EWR: -5, BOS: -5, YYZ: -5, ORD: -6, IAH: -6, DFW: -6, HNL: -10,
  SYD: 10, MEL: 10, BNE: 10, PER: 8, AKL: 12, GUM: 10, SPN: 10, ROR: 9,
  DXB: 4, AUH: 4, DOH: 3,
};
const TZ_BY_REGION: Record<Region, number> = {
  台灣: 8, 日本: 9, 韓國: 9, 港澳: 8, 中國大陸: 8, 東南亞: 8, 歐洲: 1, 美洲: -5, 大洋洲: 10, 中東: 4,
};
const tz = (a: Airport) => TZ_BY_CODE[a.code] ?? TZ_BY_REGION[a.region];

function naive(date: string, h: number, m: number): Date {
  const [y, mo, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, mo - 1, d, h, m));
}
const fmtNaive = (d: Date) => d.toISOString().slice(0, 16);
const addMin = (d: Date, min: number) => new Date(d.getTime() + min * 60000);
const flightMinutes = (km: number) => Math.round(35 + km / 13.5);

/* ───────────── 票價模型 ───────────── */

const CABIN_MULT: Record<Cabin, number> = { ECONOMY: 1, PREMIUM_ECONOMY: 1.8, BUSINESS: 3.4, FIRST: 6 };
const TIER_MULT: Record<AirlineTier, number> = { lcc: 0.62, full: 1, premium: 1.15 };

function leadTimeFactor(date: string): number {
  const days = diffDays(todayISO(), date);
  if (days < 0) return 1.5;
  if (days < 7) return 1.35;
  if (days < 14) return 1.2;
  if (days < 30) return 1.08;
  if (days < 60) return 1;
  if (days < 120) return 0.95;
  return 0.98;
}

function dowFactor(date: string, outbound: boolean): number {
  const d = parseISO(date).getDay();
  if (outbound) return d === 5 || d === 6 ? 1.12 : d === 0 ? 1.05 : 1;
  return d === 0 || d === 1 ? 1.1 : d === 6 ? 1.05 : 1;
}

function baseFare(km: number): number {
  if (km < 400) return 1500 + km * 2.4;
  return 1800 + 3.2 * Math.min(km, 3000) + 1.6 * Math.max(0, km - 3000);
}

function farePerAdult(
  p: { from: string; to: string; departDate: string; returnDate?: string; cabin: Cabin },
  tier: AirlineTier,
  stops: number,
  rnd: number,
): number {
  const a = getAirport(p.from)!;
  const b = getAirport(p.to)!;
  const km = distanceKm(a, b);
  let fare = baseFare(km);
  if (p.returnDate) fare *= km > 5000 ? 1.4 : 1.7;
  fare *= TIER_MULT[tier] * CABIN_MULT[p.cabin];
  fare *= stops === 0 ? 1 : 0.86;
  fare *= leadTimeFactor(p.departDate);
  fare *= dowFactor(p.departDate, true);
  if (p.returnDate) fare *= dowFactor(p.returnDate, false);
  if (overlapsLongWeekend(p.departDate, p.returnDate)) fare *= 1.28;
  fare *= 0.85 + rnd * 0.35;
  return fare;
}

/* ───────────── 航空公司 / 轉機點 ───────────── */

const HUB_BY_CARRIER: Record<string, string> = {
  CI: 'TPE', BR: 'TPE', JX: 'TPE', IT: 'TPE',
  CX: 'HKG', HX: 'HKG', UO: 'HKG', NX: 'MFM',
  KE: 'ICN', OZ: 'ICN', LJ: 'ICN', '7C': 'ICN', TW: 'ICN',
  JL: 'NRT', NH: 'HND', MM: 'KIX', GK: 'NRT',
  SQ: 'SIN', TR: 'SIN', TG: 'BKK', AK: 'KUL', MH: 'KUL', D7: 'KUL',
  PR: 'MNL', '5J': 'MNL', VJ: 'SGN', VN: 'SGN', GA: 'CGK',
  EK: 'DXB', QR: 'DOH', EY: 'AUH', TK: 'IST',
  KL: 'AMS', AF: 'CDG', LH: 'FRA', BA: 'LHR',
  UA: 'NRT', DL: 'ICN', AA: 'NRT', AC: 'YVR', QF: 'SYD', NZ: 'AKL',
  MU: 'PVG', CA: 'PEK', CZ: 'CAN', MF: 'XMN', '9C': 'PVG',
};

/** 回傳轉機機場；若該航空的樞紐就是起訖點則回傳 null（直飛） */
function pickHub(from: Airport, to: Airport, carrier: string): Airport | null {
  const code = HUB_BY_CARRIER[carrier] ?? 'HKG';
  if (code === from.code || code === to.code) return null;
  if (from.cityCode && from.cityCode === getAirport(code)?.cityCode) return null;
  if (to.cityCode && to.cityCode === getAirport(code)?.cityCode) return null;
  return getAirport(code) ?? null;
}

function pickAircraft(durationMin: number, domestic: boolean, rng: () => number): string {
  if (domestic) return rng() < 0.7 ? 'ATR 72-600' : 'A321';
  if (durationMin < 150) return ['A320', 'A321neo', '737-800', 'A320neo'][Math.floor(rng() * 4)];
  if (durationMin < 420) return ['A321neo', 'A330-300', '787-9', 'A330-900neo', '737-800'][Math.floor(rng() * 5)];
  return ['777-300ER', 'A350-900', '787-9', 'A350-1000'][Math.floor(rng() * 4)];
}

function buildItinerary(from: Airport, to: Airport, date: string, carrier: string, hub: Airport | null, rng: () => number): Itinerary {
  const depH = 6 + Math.floor(rng() * 17);
  const depM = Math.floor(rng() * 12) * 5;
  let cursor = naive(date, depH, depM);
  const legs: [Airport, Airport][] = hub ? [[from, hub], [hub, to]] : [[from, to]];
  const segments: FlightSegment[] = [];
  let total = 0;
  const domestic = from.region === '台灣' && to.region === '台灣';
  legs.forEach(([a, b], i) => {
    const dur = flightMinutes(distanceKm(a, b));
    const dep = cursor;
    const arr = addMin(dep, dur + (tz(b) - tz(a)) * 60);
    segments.push({
      from: a.code,
      to: b.code,
      departAt: fmtNaive(dep),
      arriveAt: fmtNaive(arr),
      carrier,
      flightNumber: `${carrier}${100 + Math.floor(rng() * 800)}`,
      durationMin: dur,
      aircraft: pickAircraft(dur, domestic, rng),
    });
    total += dur;
    if (i < legs.length - 1) {
      const layover = 75 + Math.floor(rng() * 36) * 5;
      total += layover;
      cursor = addMin(arr, layover);
    }
  });
  return { segments, durationMin: total, stops: segments.length - 1 };
}

/* ───────────── 機票 ───────────── */

export function generateFlightOffers(p: FlightSearchParams): FlightOffer[] {
  const from = getAirport(p.from);
  const to = getAirport(p.to);
  if (!from || !to) throw new Error('不支援的機場代碼');
  const key = `${p.from}-${p.to}-${p.departDate}-${p.returnDate ?? ''}-${p.cabin}`;
  const rng = rngFor(key);
  const carriers = routeAirlineCodes(from.code, to.code);
  const km = distanceKm(from, to);
  // 每家常飛的航空公司至少產生一筆航班，指定航空公司搜尋時才不會查無結果
  const n = Math.max(10 + Math.floor(rng() * 10), carriers.length + 4);
  const offers: FlightOffer[] = [];

  for (let i = 0; i < n; i++) {
    const carrier = i < carriers.length ? carriers[i] : carriers[Math.floor(rng() * carriers.length)];
    const airline = AIRLINES[carrier] ?? { name: carrier, tier: 'full' as const };
    let hub = pickHub(from, to, carrier);
    const wantsStop = rng() < (km < 1500 ? 0.2 : km < 4000 ? 0.45 : 0.7);
    if (p.nonStop || !wantsStop) hub = null;
    const stops = hub ? 1 : 0;
    const itineraries = [buildItinerary(from, to, p.departDate, carrier, hub, rng)];
    if (p.returnDate) itineraries.push(buildItinerary(to, from, p.returnDate, carrier, hub, rng));
    const base = farePerAdult(p, airline.tier, stops, rng());
    const perAdult = Math.round((base * liveFactor(`${key}:${carrier}:${i}`)) / 10) * 10;
    const price = perAdult * p.adults + Math.round(perAdult * 0.75) * p.children + Math.round(perAdult * 0.1) * p.infants;
    const seatsRoll = rng();
    offers.push({
      id: `demo-${hash(`${key}:${i}`).toString(36)}`,
      kind: 'flight',
      price,
      currency: 'TWD',
      pricePerAdult: perAdult,
      itineraries,
      carriers: [carrier],
      validatingCarrier: carrier,
      seatsLeft: seatsRoll < 0.3 ? 1 + Math.floor(seatsRoll * 20) : undefined,
      baggageIncluded: airline.tier !== 'lcc' || rng() < 0.3,
      source: 'demo',
      deepLinks: [],
    });
  }
  return offers.sort((a, b) => a.price - b.price);
}

const simulateLatency = () => new Promise<void>((r) => setTimeout(r, 250 + Math.random() * 450));

export async function searchFlightsDemo(p: FlightSearchParams): Promise<FlightOffer[]> {
  await simulateLatency();
  return generateFlightOffers(p);
}

export async function priceCalendarDemo(
  from: string,
  to: string,
  month: string,
  tripLength: number | null,
  cabin: Cabin,
  carriers?: string[],
): Promise<CalendarDay[]> {
  const [y, m] = month.split('-').map(Number);
  const last = new Date(y, m, 0).getDate();
  const today = todayISO();
  const days: CalendarDay[] = [];
  for (let d = 1; d <= last; d++) {
    const date = `${month}-${String(d).padStart(2, '0')}`;
    if (date < today) {
      days.push({ date, price: null });
      continue;
    }
    const offers = generateFlightOffers({
      from,
      to,
      departDate: date,
      returnDate: tripLength != null ? addDays(date, tripLength) : undefined,
      adults: 1,
      children: 0,
      infants: 0,
      cabin,
      nonStop: false,
    });
    const match = carriers?.length ? offers.find((o) => o.carriers.every((c) => carriers.includes(c))) : offers[0];
    days.push({ date, price: match?.price ?? null });
  }
  await simulateLatency();
  return days;
}

/* ───────────── 住宿 ───────────── */

const BRANDS: Partial<Record<Region, string[]>> & { default: string[] } = {
  日本: ['APA Hotel', '東橫INN', '相鐵FRESA INN', '三井花園飯店', 'Dormy Inn', 'Hotel Gracery', '東急STAY', '京王Presso Inn', 'Daiwa Roynet Hotel', 'Richmond Hotel', 'Villa Fontaine', 'Candeo Hotels', 'JR東日本 METS', 'Hotel Monterey', 'OMO by 星野集團', 'Hotel Resol', 'Comfort Hotel', 'Sotetsu Grand Fresa'],
  韓國: ['Lotte City Hotel', 'Shilla Stay', 'Nine Tree Premier', 'L7 Hotels', 'Hotel Skypark', 'ibis Styles Ambassador', 'Aloft', 'Sotetsu Hotels The Splaisir', 'Tmark Grand', 'Hotel 28', 'Fairfield by Marriott', 'Solaria Nishitetsu'],
  台灣: ['老爺行旅', '承億文旅', '捷絲旅', '福容大飯店', '煙波大飯店', '雲品溫泉酒店', '趣淘漫旅', '城市商旅', '天成文旅', '綠舞國際觀光飯店', '福泰飯店', '長榮桂冠酒店', '晶英酒店', '凱撒飯店', '國賓大飯店', 'amba 意舍', '金典酒店', '寒沐酒店', '英迪格酒店', '美侖大飯店'],
  港澳: ['iclub', 'Dorsett', 'Hotel COZi', 'Royal Plaza', 'Harbour Plaza', 'Regal', 'Ovolo', 'The Mira', 'Sheraton', 'Hotel Okura', 'Studio City', 'Conrad', 'Galaxy', 'Hyatt Centric'],
  東南亞: ['Centara', 'Eastin Grand', 'Novotel', 'Holiday Inn Express', 'ibis', 'Amara', 'Pullman', 'Avani', 'Mercure', 'Red Planet', 'Grand Mercure', 'Mövenpick', 'Anantara', 'Dusit Thani', 'Hyatt Regency', 'Vinpearl', 'Bangkok Marriott'],
  default: ['Hilton', 'Marriott', 'Hyatt Regency', 'Sheraton', 'Four Points', 'Mercure', 'ibis budget', 'Holiday Inn', 'citizenM', 'Premier Inn', 'Moxy', 'Hampton by Hilton', 'Courtyard', 'Novotel', 'Radisson Blu'],
};
const ROOM_TYPES = ['標準雙人房', '高級雙床房', '豪華大床房', '經濟雙人房', '家庭四人房', '高樓層景觀房', '精緻雙人房'];

export function generateHotelOffers(p: HotelSearchParams): HotelOffer[] {
  const city = getCity(p.city);
  if (!city) throw new Error('不支援的目的地');
  const nights = diffDays(p.checkIn, p.checkOut);
  if (nights < 1) throw new Error('退房日期需晚於入住日期');
  const key = `${p.city}-${p.checkIn}-${p.checkOut}-${p.adults}-${p.rooms}`;
  const rng = rngFor(key);
  const brands = BRANDS[city.region] ?? BRANDS.default;

  let weekendNights = 0;
  let holidayNights = 0;
  for (let i = 0; i < nights; i++) {
    const d = addDays(p.checkIn, i);
    const dow = parseISO(d).getDay();
    if (dow === 5 || dow === 6) weekendNights++;
    if (inLongWeekend(d)) holidayNights++;
  }
  const seasonal = 1 + 0.2 * (weekendNights / nights) + 0.3 * (holidayNights / nights);
  const lead = leadTimeFactor(p.checkIn);
  const n = 12 + Math.floor(rng() * 8);
  const used = new Set<string>();
  const offers: HotelOffer[] = [];

  for (let i = 0; i < n; i++) {
    const brand = brands[Math.floor(rng() * brands.length)];
    const area = city.areas[Math.floor(rng() * city.areas.length)];
    const name = city.region === '台灣' ? `${area}${brand}` : `${brand} ${area}`;
    if (used.has(name)) continue;
    used.add(name);
    const r = rng();
    const stars = r < 0.35 ? 3 : r < 0.8 ? 4 : 5;
    const base = { 3: 2600, 4: 4500, 5: 9000 }[stars];
    const perNight = Math.round((base * city.priceTier * seasonal * lead * (0.8 + rng() * 0.45) * liveFactor(`${key}:${name}`)) / 10) * 10;
    const rating = Math.round((stars === 5 ? 8.6 + rng() * 1.0 : stars === 4 ? 7.9 + rng() * 1.2 : 7.0 + rng() * 1.5) * 10) / 10;
    offers.push({
      id: `demo-${hash(`${key}:${name}`).toString(36)}`,
      kind: 'hotel',
      name,
      stars,
      rating,
      reviewCount: 120 + Math.floor(rng() * 4000),
      area,
      distanceKm: Math.round((0.3 + rng() * 5.5) * 10) / 10,
      pricePerNight: perNight,
      totalPrice: perNight * nights * p.rooms,
      currency: 'TWD',
      nights,
      roomType: ROOM_TYPES[Math.floor(rng() * ROOM_TYPES.length)],
      breakfast: rng() < 0.45,
      freeCancel: rng() < 0.6,
      lat: city.lat + (rng() - 0.5) * 0.06,
      lng: city.lng + (rng() - 0.5) * 0.06,
      source: 'demo',
      deepLinks: [],
    });
  }
  return offers.sort((a, b) => a.totalPrice - b.totalPrice);
}

export async function searchHotelsDemo(p: HotelSearchParams): Promise<HotelOffer[]> {
  await simulateLatency();
  return generateHotelOffers(p);
}
