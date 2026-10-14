import os from 'node:os';
import path from 'node:path';
import type { ProviderName } from './types';

function str(name: string, fallback = ''): string {
  const v = process.env[name];
  return v == null || v === '' ? fallback : v;
}

function resolveProvider(setting: string, has: { serpapi: boolean; travelpayouts: boolean; amadeus: boolean }): ProviderName {
  if (setting === 'serpapi' || setting === 'travelpayouts' || setting === 'amadeus' || setting === 'demo') return setting;
  if (has.serpapi) return 'serpapi';
  if (has.travelpayouts) return 'travelpayouts';
  if (has.amadeus) return 'amadeus';
  return 'demo';
}

export const env = {
  /** Vercel / Lambda 等無法常駐的環境：關閉內建排程與 Telegram 輪詢，改用 webhook 與外部 cron */
  get isServerless(): boolean {
    return !!process.env.VERCEL || !!process.env.AWS_LAMBDA_FUNCTION_NAME || !!process.env.NETLIFY;
  },
  get appUrl(): string {
    const explicit = str('APP_URL');
    if (explicit) return explicit.replace(/\/$/, '');
    const vercel = str('VERCEL_PROJECT_PRODUCTION_URL') || str('VERCEL_URL');
    if (vercel) return `https://${vercel}`;
    return 'http://localhost:3000';
  },
  get appPassword(): string {
    return str('APP_PASSWORD');
  },
  /** Turso / libSQL 雲端資料庫（設定後優先於本機 SQLite） */
  get turso() {
    const url = str('TURSO_DATABASE_URL');
    return { url, token: str('TURSO_AUTH_TOKEN'), configured: !!url };
  },
  /** 本機 SQLite 檔案路徑；無伺服器環境沒有可寫目錄時退回暫存資料夾 */
  get sqlitePath(): string {
    const p = str('DATABASE_PATH');
    if (p) return path.isAbsolute(p) ? p : path.join(process.cwd(), p);
    if (this.isServerless) return path.join(os.tmpdir(), 'best-booking.db');
    return path.join(process.cwd(), 'data', 'best-booking.db');
  },
  get amadeus() {
    const id = str('AMADEUS_CLIENT_ID');
    const secret = str('AMADEUS_CLIENT_SECRET');
    return {
      id,
      secret,
      configured: !!id && !!secret,
      production: str('AMADEUS_ENV', 'test') === 'production',
    };
  },
  /** SerpApi：Google 航班 / Google 飯店即時價格 */
  get serpapi() {
    const key = str('SERPAPI_KEY');
    return { key, configured: !!key, endpoint: str('SERPAPI_ENDPOINT', 'https://serpapi.com/search.json') };
  },
  /** Travelpayouts（Aviasales 快取價格）：免費、額度大，當追蹤用的價格雷達 */
  get travelpayouts() {
    const token = str('TRAVELPAYOUTS_TOKEN');
    const markets = str('TRAVELPAYOUTS_MARKETS', 'us,ru')
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    return {
      token,
      configured: !!token,
      markets: markets.length ? markets : ['us', 'ru'],
      marker: str('TRAVELPAYOUTS_MARKER'),
      currency: str('TRAVELPAYOUTS_CURRENCY', 'usd').toLowerCase(),
      endpoint: str('TRAVELPAYOUTS_ENDPOINT', 'https://api.travelpayouts.com/aviasales/v3'),
    };
  },
  /** 搜尋結果頁與價格確認用的機票來源 */
  get flightProvider(): ProviderName {
    return resolveProvider(str('FLIGHT_PROVIDER', 'auto'), {
      serpapi: this.serpapi.configured,
      travelpayouts: this.travelpayouts.configured,
      amadeus: this.amadeus.configured,
    });
  },
  /** 追蹤時頻繁查價用的來源：有 Travelpayouts 就用它，低於目標再用 flightProvider 確認 */
  get radarProvider(): ProviderName {
    const setting = str('RADAR_PROVIDER', 'auto');
    if (setting !== 'auto') return resolveProvider(setting, { serpapi: false, travelpayouts: false, amadeus: false });
    return this.travelpayouts.configured ? 'travelpayouts' : this.flightProvider;
  },
  get hotelProvider(): ProviderName {
    return resolveProvider(str('HOTEL_PROVIDER', 'auto'), { serpapi: this.serpapi.configured, travelpayouts: false, amadeus: this.amadeus.configured });
  },
  get line() {
    const token = str('LINE_CHANNEL_ACCESS_TOKEN');
    const secret = str('LINE_CHANNEL_SECRET');
    const basicId = str('LINE_BOT_BASIC_ID');
    return {
      token,
      secret,
      basicId: basicId || null,
      configured: !!token && !!secret,
      addFriendUrl: basicId ? `https://line.me/R/ti/p/${encodeURIComponent(basicId.startsWith('@') ? basicId : '@' + basicId)}` : null,
    };
  },
  get telegram() {
    const token = str('TELEGRAM_BOT_TOKEN');
    const username = str('TELEGRAM_BOT_USERNAME').replace(/^@/, '');
    return {
      token,
      username: username || null,
      configured: !!token,
      polling: !this.isServerless && str('TELEGRAM_POLLING', 'true') !== 'false',
      webhookSecret: str('TELEGRAM_WEBHOOK_SECRET'),
    };
  },
  get cronSecret(): string {
    return str('CRON_SECRET');
  },
  get schedulerEnabled(): boolean {
    if (this.isServerless) return false;
    return str('SCHEDULER_ENABLED', 'true') !== 'false';
  },
  get tickSeconds(): number {
    const n = Number(str('CHECK_TICK_SECONDS', '60'));
    return Number.isFinite(n) && n >= 10 ? n : 60;
  },
};

export function errMsg(e: unknown): string {
  if (e instanceof Error) return e.message;
  return String(e);
}
