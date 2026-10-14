/**
 * Amadeus Self-Service API 介接（https://developers.amadeus.com/）
 * - 機票：Flight Offers Search v2
 * - 住宿：Hotel List (by geocode) + Hotel Search v3
 * - 價格日曆：Flight Cheapest Date Search v1（測試環境僅支援部分航線）
 */
import { getCity } from '../cities';
import { env, errMsg } from '../env';
import { diffDays } from '../format';
import type { CalendarDay, FlightOffer, FlightSearchParams, FlightSegment, HotelOffer, HotelSearchParams, Itinerary } from '../types';

const base = () => (env.amadeus.production ? 'https://api.amadeus.com' : 'https://test.api.amadeus.com');

let tokenCache: { token: string; expiresAt: number } | null = null;

async function getToken(): Promise<string> {
  const { id, secret, configured } = env.amadeus;
  if (!configured) throw new Error('尚未設定 AMADEUS_CLIENT_ID / AMADEUS_CLIENT_SECRET');
  if (tokenCache && tokenCache.expiresAt > Date.now() + 30_000) return tokenCache.token;
  const res = await fetch(`${base()}/v1/security/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'client_credentials', client_id: id, client_secret: secret }),
  });
  if (!res.ok) throw new Error(`Amadeus 認證失敗 (${res.status})，請檢查金鑰與 AMADEUS_ENV`);
  const j = (await res.json()) as { access_token: string; expires_in: number };
  tokenCache = { token: j.access_token, expiresAt: Date.now() + j.expires_in * 1000 };
  return j.access_token;
}

async function amadeusGet<T>(path: string, params: Record<string, string | number | boolean | undefined>): Promise<T> {
  const token = await getToken();
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== '') sp.set(k, String(v));
  const res = await fetch(`${base()}${path}?${sp}`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
  const text = await res.text();
  if (!res.ok) {
    let detail = '';
    try {
      const j = JSON.parse(text) as { errors?: { title?: string; detail?: string }[] };
      detail = j.errors?.map((e) => e.detail || e.title).filter(Boolean).join('; ') ?? '';
    } catch {
      /* ignore */
    }
    throw new Error(`Amadeus API 錯誤 ${res.status}${detail ? `：${detail}` : ''}`);
  }
  return JSON.parse(text) as T;
}

function isoDurationToMin(s: string | undefined): number {
  if (!s) return 0;
  const m = /P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?/.exec(s);
  if (!m) return 0;
  return Number(m[1] ?? 0) * 1440 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0);
}

/* ───────────── 機票 ───────────── */

interface AmSegment {
  departure: { iataCode: string; at: string };
  arrival: { iataCode: string; at: string };
  carrierCode: string;
  number: string;
  aircraft?: { code: string };
  operating?: { carrierCode: string };
  duration?: string;
}
interface AmOffer {
  id: string;
  numberOfBookableSeats?: number;
  itineraries: { duration?: string; segments: AmSegment[] }[];
  price: { currency: string; total: string; grandTotal?: string };
  validatingAirlineCodes?: string[];
  travelerPricings?: {
    travelerType: string;
    price: { total: string };
    fareDetailsBySegment?: { includedCheckedBags?: { quantity?: number; weight?: number } }[];
  }[];
}
interface AmFlightResp {
  data?: AmOffer[];
  dictionaries?: { aircraft?: Record<string, string> };
}

export async function searchFlightsAmadeus(p: FlightSearchParams): Promise<FlightOffer[]> {
  const r = await amadeusGet<AmFlightResp>('/v2/shopping/flight-offers', {
    originLocationCode: p.from,
    destinationLocationCode: p.to,
    departureDate: p.departDate,
    returnDate: p.returnDate,
    adults: p.adults,
    children: p.children || undefined,
    infants: p.infants || undefined,
    travelClass: p.cabin,
    nonStop: p.nonStop ? 'true' : undefined,
    currencyCode: 'TWD',
    max: 50,
  });
  return (r.data ?? []).map((o): FlightOffer => {
    const itineraries: Itinerary[] = o.itineraries.map((it) => {
      const segments: FlightSegment[] = it.segments.map((s) => ({
        from: s.departure.iataCode,
        to: s.arrival.iataCode,
        departAt: s.departure.at.slice(0, 16),
        arriveAt: s.arrival.at.slice(0, 16),
        carrier: s.carrierCode,
        flightNumber: `${s.carrierCode}${s.number}`,
        operatingCarrier: s.operating?.carrierCode,
        durationMin: isoDurationToMin(s.duration),
        aircraft: s.aircraft ? r.dictionaries?.aircraft?.[s.aircraft.code] ?? s.aircraft.code : undefined,
      }));
      return { segments, durationMin: isoDurationToMin(it.duration), stops: Math.max(0, segments.length - 1) };
    });
    const carriers = [...new Set(itineraries.flatMap((i) => i.segments.map((s) => s.carrier)))];
    const adult = o.travelerPricings?.find((t) => t.travelerType === 'ADULT');
    const bags = adult?.fareDetailsBySegment?.[0]?.includedCheckedBags;
    const total = Math.round(Number(o.price.grandTotal ?? o.price.total));
    return {
      id: `am-${o.id}`,
      kind: 'flight',
      price: total,
      currency: o.price.currency,
      pricePerAdult: adult ? Math.round(Number(adult.price.total)) : Math.round(total / Math.max(1, p.adults)),
      itineraries,
      carriers,
      validatingCarrier: o.validatingAirlineCodes?.[0],
      seatsLeft: o.numberOfBookableSeats,
      baggageIncluded: bags ? (bags.quantity ?? 0) > 0 || (bags.weight ?? 0) > 0 : undefined,
      source: 'amadeus',
      deepLinks: [],
    };
  });
}

/* ───────────── 住宿 ───────────── */

interface AmHotelListResp {
  data?: {
    hotelId: string;
    name: string;
    rating?: string;
    distance?: { value: number; unit: string };
    geoCode?: { latitude: number; longitude: number };
  }[];
}
interface AmHotelOffersResp {
  data?: {
    hotel: { hotelId: string; name: string; rating?: string; latitude?: number; longitude?: number };
    available: boolean;
    offers?: {
      id: string;
      room?: { typeEstimated?: { category?: string } };
      boardType?: string;
      price: { currency: string; total: string };
      policies?: { refundable?: { cancellationRefund?: string } };
    }[];
  }[];
}

const ROOM_CATEGORY: Record<string, string> = {
  STANDARD_ROOM: '標準客房',
  SUPERIOR_ROOM: '高級客房',
  DELUXE_ROOM: '豪華客房',
  EXECUTIVE_ROOM: '行政客房',
  SUITE: '套房',
  JUNIOR_SUITE: '小型套房',
  FAMILY_ROOM: '家庭房',
  ACCESSIBLE_ROOM: '無障礙客房',
  BUDGET_ROOM: '經濟客房',
};

function titleCase(s: string): string {
  if (s !== s.toUpperCase()) return s;
  return s.toLowerCase().replace(/(^|\s|-)\S/g, (c) => c.toUpperCase());
}

export async function searchHotelsAmadeus(p: HotelSearchParams): Promise<HotelOffer[]> {
  const city = getCity(p.city);
  if (!city) throw new Error('不支援的目的地');
  const nights = Math.max(1, diffDays(p.checkIn, p.checkOut));
  const list = await amadeusGet<AmHotelListResp>('/v1/reference-data/locations/hotels/by-geocode', {
    latitude: city.lat,
    longitude: city.lng,
    radius: 12,
    radiusUnit: 'KM',
    hotelSource: 'ALL',
  });
  const hotels = (list.data ?? []).slice(0, 60);
  const meta = new Map(hotels.map((h) => [h.hotelId, h]));
  const out: HotelOffer[] = [];
  const ids = hotels.map((h) => h.hotelId);

  for (let i = 0; i < ids.length; i += 20) {
    const chunk = ids.slice(i, i + 20);
    try {
      const r = await amadeusGet<AmHotelOffersResp>('/v3/shopping/hotel-offers', {
        hotelIds: chunk.join(','),
        checkInDate: p.checkIn,
        checkOutDate: p.checkOut,
        adults: p.adults,
        roomQuantity: p.rooms,
        currency: 'TWD',
        bestRateOnly: 'true',
      });
      for (const h of r.data ?? []) {
        const offer = h.offers?.[0];
        if (!h.available || !offer) continue;
        const m = meta.get(h.hotel.hotelId);
        const total = Math.round(Number(offer.price.total));
        const stars = h.hotel.rating ?? m?.rating;
        const refundable = offer.policies?.refundable?.cancellationRefund;
        const category = offer.room?.typeEstimated?.category;
        out.push({
          id: `am-${h.hotel.hotelId}-${offer.id}`,
          kind: 'hotel',
          name: titleCase(h.hotel.name),
          stars: stars ? Number(stars) : undefined,
          distanceKm: m?.distance ? Math.round(m.distance.value * 10) / 10 : undefined,
          pricePerNight: Math.round(total / nights / Math.max(1, p.rooms)),
          totalPrice: total,
          currency: offer.price.currency,
          nights,
          roomType: category ? ROOM_CATEGORY[category] ?? category.replace(/_/g, ' ') : undefined,
          breakfast: offer.boardType ? /BREAKFAST|HALF_BOARD|FULL_BOARD|ALL_INCLUSIVE/.test(offer.boardType) : undefined,
          freeCancel: refundable ? refundable === 'REFUNDABLE_UP_TO_DEADLINE' : undefined,
          lat: h.hotel.latitude ?? m?.geoCode?.latitude,
          lng: h.hotel.longitude ?? m?.geoCode?.longitude,
          source: 'amadeus',
          deepLinks: [],
        });
      }
    } catch (e) {
      console.warn('[amadeus] hotel-offers 查詢失敗：', errMsg(e));
    }
  }
  if (out.length === 0 && hotels.length > 0) {
    throw new Error('Amadeus 查無可訂房的報價（測試環境資料有限）');
  }
  return out.sort((a, b) => a.totalPrice - b.totalPrice);
}

/* ───────────── 價格日曆 ───────────── */

interface AmFlightDatesResp {
  data?: { departureDate: string; price: { total: string } }[];
  meta?: { currency?: string };
}

export async function priceCalendarAmadeus(
  from: string,
  to: string,
  month: string,
  tripLength: number | null,
): Promise<{ days: CalendarDay[]; currency: string }> {
  const [y, m] = month.split('-').map(Number);
  const last = new Date(y, m, 0).getDate();
  const r = await amadeusGet<AmFlightDatesResp>('/v1/shopping/flight-dates', {
    origin: from,
    destination: to,
    departureDate: `${month}-01,${month}-${String(last).padStart(2, '0')}`,
    oneWay: tripLength == null ? 'true' : 'false',
    duration: tripLength ?? undefined,
    nonStop: 'false',
    viewBy: 'DATE',
  });
  const map = new Map<string, number>();
  for (const d of r.data ?? []) {
    const price = Math.round(Number(d.price.total));
    const prev = map.get(d.departureDate);
    if (prev == null || price < prev) map.set(d.departureDate, price);
  }
  const days = Array.from({ length: last }, (_, i) => {
    const date = `${month}-${String(i + 1).padStart(2, '0')}`;
    return { date, price: map.get(date) ?? null };
  });
  return { days, currency: r.meta?.currency ?? 'EUR' };
}
