export type Cabin = 'ECONOMY' | 'PREMIUM_ECONOMY' | 'BUSINESS' | 'FIRST';
export const CABIN_LABEL: Record<Cabin, string> = {
  ECONOMY: '經濟艙',
  PREMIUM_ECONOMY: '豪華經濟艙',
  BUSINESS: '商務艙',
  FIRST: '頭等艙',
};
export const CABINS: Cabin[] = ['ECONOMY', 'PREMIUM_ECONOMY', 'BUSINESS', 'FIRST'];

export interface FlightSearchParams {
  from: string;
  to: string;
  departDate: string;
  returnDate?: string;
  adults: number;
  children: number;
  infants: number;
  cabin: Cabin;
  nonStop: boolean;
  /** 指定航空公司（兩碼代碼，可多選；所有航段都須是這些航空公司） */
  carriers?: string[];
}

export interface HotelSearchParams {
  city: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  rooms: number;
  /** 只追蹤特定飯店（名稱完全相符） */
  hotelName?: string;
}

export type ProviderName = 'demo' | 'amadeus' | 'serpapi';

export type DeepLinkKind = 'google' | 'skyscanner' | 'trip' | 'airline' | 'agoda' | 'booking' | 'other';
export interface DeepLink {
  kind: DeepLinkKind;
  label: string;
  url: string;
}

export interface FlightSegment {
  from: string;
  to: string;
  /** 當地時間，格式 YYYY-MM-DDTHH:mm（不含時區） */
  departAt: string;
  arriveAt: string;
  carrier: string;
  flightNumber: string;
  operatingCarrier?: string;
  durationMin: number;
  aircraft?: string;
}

export interface Itinerary {
  segments: FlightSegment[];
  durationMin: number;
  stops: number;
}

export interface FlightOffer {
  id: string;
  kind: 'flight';
  /** 所有旅客總價（整數） */
  price: number;
  currency: string;
  pricePerAdult: number;
  itineraries: Itinerary[];
  carriers: string[];
  validatingCarrier?: string;
  seatsLeft?: number;
  baggageIncluded?: boolean;
  /** 來回票只拿到去程班次（價格是來回總價，回程要到預訂網站選） */
  returnPending?: boolean;
  source: ProviderName;
  deepLinks: DeepLink[];
}

export interface HotelOffer {
  id: string;
  kind: 'hotel';
  name: string;
  stars?: number;
  rating?: number;
  reviewCount?: number;
  area?: string;
  distanceKm?: number;
  pricePerNight: number;
  totalPrice: number;
  currency: string;
  nights: number;
  roomType?: string;
  breakfast?: boolean;
  freeCancel?: boolean;
  lat?: number;
  lng?: number;
  source: ProviderName;
  deepLinks: DeepLink[];
}

export type Offer = FlightOffer | HotelOffer;

export interface SearchResponse<T> {
  offers: T[];
  provider: ProviderName;
  fetchedAt: string;
  cached: boolean;
  warnings: string[];
}

export interface CalendarDay {
  date: string;
  price: number | null;
}
export interface CalendarResponse {
  month: string;
  days: CalendarDay[];
  provider: ProviderName;
  tripLength: number | null;
  currency: string;
  warnings: string[];
}

export type WatchType = 'flight' | 'hotel';

export interface PricePoint {
  price: number;
  currency: string;
  checkedAt: string;
}

interface WatchBase {
  id: string;
  title: string;
  targetPrice: number | null;
  notifyOnDrop: boolean;
  dropPercent: number;
  intervalMin: number;
  active: boolean;
  lastPrice: number | null;
  lowestPrice: number | null;
  lastCheckedAt: string | null;
  lastNotifiedAt: string | null;
  lastNotifiedPrice: number | null;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
  history: PricePoint[];
}
export interface FlightWatch extends WatchBase {
  type: 'flight';
  params: FlightSearchParams;
  lastResult: FlightOffer | null;
}
export interface HotelWatch extends WatchBase {
  type: 'hotel';
  params: HotelSearchParams;
  lastResult: HotelOffer | null;
}
export type Watch = FlightWatch | HotelWatch;

export interface WatchInput {
  type: WatchType;
  title?: string;
  params: FlightSearchParams | HotelSearchParams;
  targetPrice?: number | null;
  notifyOnDrop?: boolean;
  dropPercent?: number;
  intervalMin?: number;
}

export type ChannelType = 'line' | 'telegram';
export interface Channel {
  id: string;
  type: ChannelType;
  target: string;
  displayName: string | null;
  enabled: boolean;
  createdAt: string;
}
export interface ChannelResult {
  type: ChannelType;
  target: string;
  ok: boolean;
  error?: string;
}

export interface AlertRecord {
  id: string;
  watchId: string | null;
  title: string;
  body: string;
  price: number | null;
  url: string | null;
  channels: ChannelResult[];
  createdAt: string;
}

export interface StatusResponse {
  providers: { flight: ProviderName; hotel: ProviderName; amadeusEnv: 'test' | 'production' | null };
  line: { configured: boolean; basicId: string | null; addFriendUrl: string | null };
  telegram: { configured: boolean; username: string | null; polling: boolean };
  scheduler: {
    enabled: boolean;
    started: boolean;
    lastTickAt: string | null;
    lastRunSummary: string | null;
    tickSeconds: number;
  };
  db: { backend: 'sqlite' | 'turso'; persistent: boolean; location: string; error: string | null };
  serverless: boolean;
  appUrl: string;
  passwordProtected: boolean;
  features: { calendar: boolean };
}
