import { errMsg } from './env';
import { fmtPrice } from './format';
import { notifyAll } from './notify';
import { buildWatchPayload, payloadText } from './notify/messages';
import { addPricePoint, createAlert, listWatches, updateWatch } from './repo';
import { offerPrice, searchFlights, searchHotels } from './search';
import type { ChannelResult, Offer, Watch } from './types';

export interface CheckOutcome {
  id: string;
  title: string;
  price: number | null;
  notified: boolean;
  reason: string | null;
  error: string | null;
  channels: ChannelResult[];
}

/** 價格持續達標時，每 24 小時最多再提醒一次 */
const REMIND_AFTER_MS = 24 * 60 * 60 * 1000;

export async function checkWatch(w: Watch, opts: { force?: boolean } = {}): Promise<CheckOutcome> {
  const now = new Date().toISOString();
  const outcome: CheckOutcome = { id: w.id, title: w.title, price: null, notified: false, reason: null, error: null, channels: [] };
  try {
    let offer: Offer | undefined;
    if (w.type === 'flight') offer = (await searchFlights(w.params, { bypassCache: opts.force })).offers[0];
    else offer = (await searchHotels(w.params, { bypassCache: opts.force })).offers[0];

    if (!offer) {
      await updateWatch(w.id, { lastCheckedAt: now, lastError: '查無報價' });
      outcome.error = '查無報價';
      return outcome;
    }

    const price = offerPrice(offer);
    const cur = offer.currency;
    outcome.price = price;
    await addPricePoint(w.id, price, cur, now);

    const prev = w.lastPrice;
    const lowest = w.lowestPrice;
    const reasons: string[] = [];
    if (w.targetPrice != null && price <= w.targetPrice) {
      reasons.push(`🎯 達到目標價 ${fmtPrice(w.targetPrice, cur)}`);
    }
    if (w.notifyOnDrop && prev != null && price <= prev * (1 - w.dropPercent / 100)) {
      const drop = Math.round(((prev - price) / prev) * 1000) / 10;
      reasons.push(`📉 比上次低 ${drop}%（${fmtPrice(prev, cur)} → ${fmtPrice(price, cur)}）`);
    } else if (w.notifyOnDrop && lowest != null && price < lowest) {
      reasons.push(`📉 歷史新低（原最低 ${fmtPrice(lowest, cur)}）`);
    }

    const cheaperThanLastNotice = w.lastNotifiedPrice == null || price < w.lastNotifiedPrice;
    const remindDue = !w.lastNotifiedAt || Date.now() - Date.parse(w.lastNotifiedAt) > REMIND_AFTER_MS;
    const shouldNotify = reasons.length > 0 && (cheaperThanLastNotice || remindDue);

    if (shouldNotify) {
      const reason = reasons.join('\n');
      const payload = buildWatchPayload(w, offer, price, reason);
      const channels = await notifyAll(payload);
      await createAlert({ watchId: w.id, title: payload.title, body: payloadText(payload), price, url: payload.url, channels });
      outcome.notified = true;
      outcome.reason = reason;
      outcome.channels = channels;
    }

    await updateWatch(w.id, {
      lastPrice: price,
      lowestPrice: lowest == null ? price : Math.min(lowest, price),
      lastCheckedAt: now,
      lastError: null,
      lastResult: offer,
      ...(shouldNotify ? { lastNotifiedAt: now, lastNotifiedPrice: price } : {}),
    });
  } catch (e) {
    const msg = errMsg(e);
    outcome.error = msg;
    try {
      await updateWatch(w.id, { lastCheckedAt: now, lastError: msg });
    } catch (e2) {
      console.error('[watcher] 無法寫入錯誤狀態：', errMsg(e2));
    }
  }
  return outcome;
}

/** 排程觸發時間會有幾秒誤差，保留一點緩衝，避免 5 分鐘的追蹤被拖成 10 分鐘才檢查 */
export function isDue(w: Watch, now = Date.now()): boolean {
  if (!w.active) return false;
  if (!w.lastCheckedAt) return true;
  const intervalMs = w.intervalMin * 60000;
  const grace = Math.min(90_000, intervalMs * 0.3);
  return Date.parse(w.lastCheckedAt) + intervalMs - grace <= now;
}

/** 依序檢查到期的追蹤（避免同時打爆供應商 API） */
export async function runDueWatches(opts: { force?: boolean } = {}): Promise<CheckOutcome[]> {
  const watches = (await listWatches()).filter((w) => (opts.force ? w.active : isDue(w)));
  const out: CheckOutcome[] = [];
  for (const w of watches) out.push(await checkWatch(w, { force: opts.force }));
  return out;
}
