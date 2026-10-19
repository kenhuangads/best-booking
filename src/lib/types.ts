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
  /** 用飯店名稱搜尋（模糊比對，找到後再選一間追蹤） */
  keyword?: string;
  /** Google 飯店的編號：追蹤單一飯店時用它精準查價，不怕名稱寫法不同 */
  propertyToken?: string;
}

export type ProviderName = 'demo' | 'amadeus' | 'serpapi' | 'travelpayouts';

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
  /** 快取價格：時間為估計、價格可能已變動 */
  approximate?: boolean;
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
  /** Google 飯店的編號（SerpApi） */
  propertyToken?: string;
  /** 不在搜尋的城市（用名稱直接找到的） */
  outsideCity?: boolean;
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
  /** 狀態說明（不是錯誤），例如「每 10 小時向 Google 查價一次」 */
  note: string | null;
  /** 上次向 Google（SerpApi）查價的時間 */
  lastSerpAt: string | null;
  /** 雷達（Travelpayouts）上次查無此航線 */
  radarMiss: boolean;
  /** 已被 Google 否定過的快取低價，避免一直重複確認同一個過期快取 */
  radarFloor: number | null;
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
  providers: { flight: ProviderName; hotel: ProviderName; radar: ProviderName; amadeusEnv: 'test' | 'production' | null };
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
  /** SerpApi 額度與自動查價安排（未設定 SerpApi 時為 null） */
  serp: SerpPlanInfo | null;
}

export interface SerpPlanInfo {
  monthlyQuota: number;
  /** 每天自動查價上限（每月額度的 70%，其餘留給手動搜尋） */
  dailyCap: number;
  /** 需要定期向 Google 查價的追蹤筆數（住宿、快取查不到的機票） */
  dependentCount: number;
  /** 每筆追蹤向 Google 查價的間隔（小時） */
  spacingHours: number;
  /** 過去 24 小時自動查價次數 */
  usedToday: number;
  /** SerpApi 帳戶本月已用 / 剩餘（查不到時為 null） */
  used: number | null;
  left: number | null;
  /** 剩餘額度過低，暫停自動查價 */
  paused: boolean;
}
