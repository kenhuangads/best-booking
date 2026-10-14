import { airlineName } from '../airlines';
import { env } from '../env';
import { fmtDuration, fmtPrice, fmtTime } from '../format';
import type { Offer, Watch } from '../types';
import { watchSubtitle } from '../watchText';

export { watchSubtitle };

export interface NotifyPayload {
  kind: 'flight' | 'hotel' | 'test';
  title: string;
  subtitle: string;
  price: number | null;
  currency: string;
  reason: string | null;
  lines: string[];
  url: string | null;
  appUrl: string | null;
}

export function offerLines(o: Offer): string[] {
  if (o.kind === 'flight') {
    const lines = o.itineraries.map((it, i) => {
      const first = it.segments[0];
      const last = it.segments[it.segments.length - 1];
      const label = o.itineraries.length > 1 ? (i === 0 ? '去程' : '回程') : o.returnPending ? '去程' : '航班';
      const stops = it.stops ? `轉機 ${it.stops} 次` : '直飛';
      return `${label} ${airlineName(first.carrier)} ${first.flightNumber}｜${fmtTime(first.departAt)} ${first.from} → ${fmtTime(last.arriveAt)} ${last.to}｜${stops} ${fmtDuration(it.durationMin)}`;
    });
    if (o.returnPending) lines.push('回程班次請在預訂網站選擇');
    return lines;
  }
  const meta = [o.stars ? `${o.stars} 星` : '', o.rating ? `評分 ${o.rating}` : '', o.area ?? ''].filter(Boolean).join(' · ');
  const price = `每晚 ${fmtPrice(o.pricePerNight, o.currency)} × ${o.nights} 晚${o.breakfast ? ' · 含早餐' : ''}${o.freeCancel ? ' · 免費取消' : ''}`;
  return [o.name, meta, price].filter(Boolean);
}

export function buildWatchPayload(w: Watch, offer: Offer, price: number, reason: string): NotifyPayload {
  return {
    kind: w.type,
    title: `${w.type === 'flight' ? '✈️' : '🏨'} ${w.title}`,
    subtitle: watchSubtitle(w),
    price,
    currency: offer.currency,
    reason,
    lines: offerLines(offer),
    url: offer.deepLinks[0]?.url ?? null,
    appUrl: `${env.appUrl}/watches`,
  };
}

export function buildTestPayload(): NotifyPayload {
  return {
    kind: 'test',
    title: '🔔 測試通知',
    subtitle: '旅行預訂神器已成功連結',
    price: null,
    currency: 'TWD',
    reason: null,
    lines: ['之後追蹤的機票 / 住宿達到目標價或降價時，會在這裡通知你。'],
    url: null,
    appUrl: `${env.appUrl}/watches`,
  };
}

export function payloadText(p: NotifyPayload): string {
  const parts = [p.title, p.subtitle];
  if (p.price != null) parts.push(`💰 ${fmtPrice(p.price, p.currency)}`);
  if (p.reason) parts.push(p.reason);
  if (p.lines.length) parts.push('', ...p.lines);
  if (p.url) parts.push('', `前往預訂：${p.url}`);
  return parts.join('\n');
}
