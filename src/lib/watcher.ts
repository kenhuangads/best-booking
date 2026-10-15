import { env, errMsg } from './env';
import { fmtPrice, intervalLabel } from './format';
import { notifyAll } from './notify';
import { buildWatchPayload, payloadText } from './notify/messages';
import { needsSerp, serpPlan, type SerpPlan } from './quota';
import { addPricePoint, createAlert, listWatches, recordSerpCall, updateWatch, type WatchPatch } from './repo';
import { offerPrice, searchFlights, searchHotels } from './search';
import type { ChannelResult, FlightWatch, HotelWatch, Offer, Watch } from './types';

export interface CheckOutcome {
  id: string;
  title: string;
  price: number | null;
  notified: boolean;
  reason: string | null;
  error: string | null;
  /** 依額度延後，這次沒有查價（不是錯誤） */
  skipped: boolean;
  note: string | null;
  channels: ChannelResult[];
}

/** 價格持續達標時，每 24 小時最多再提醒一次 */
const REMIND_AFTER_MS = 24 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;

function fmtWait(ms: number): string {
  const min = Math.max(1, Math.ceil(ms / 60000));
  return min >= 60 ? `${Math.ceil(min / 60)} 小時` : `${min} 分鐘`;
}

type Gate = { ok: true } | { ok: false; note: string };

/** 這次可以向 Google（SerpApi）查價嗎：每筆追蹤的間隔、每天上限、剩餘額度過低時暫停；使用者按「立即檢查」不受限 */
function serpGate(w: Watch, plan: SerpPlan | null, force: boolean): Gate {
  if (!plan || force) return { ok: true };
  if (plan.paused) return { ok: false, note: `本月 Google 查價只剩 ${plan.left} 次，暫停自動查價，保留給手動搜尋` };
  if (plan.usedToday >= plan.dailyCap) return { ok: false, note: '今天的自動 Google 查價次數已用完，明天繼續' };
  const wait = (w.lastSerpAt ? Date.parse(w.lastSerpAt) : 0) + plan.spacingHours * HOUR - Date.now();
  if (wait > 0) return { ok: false, note: `每 ${plan.spacingHours} 小時向 Google 查價一次，約 ${fmtWait(wait)}後再查` };
  return { ok: true };
}

interface Picked {
  offer?: Offer;
  /** 這次不更新價格，只更新狀態說明 */
  skip?: boolean;
  note: string | null;
  extraLines: string[];
  /** 這次用了 SerpApi（記錄用途，計入額度） */
  usedSerp?: string;
  patch: WatchPatch;
}

async function pickHotel(w: HotelWatch, force: boolean, plan: SerpPlan | null): Promise<Picked> {
  if (!needsSerp(w)) return { offer: (await searchHotels(w.params, { bypassCache: force })).offers[0], note: null, extraLines: [], patch: {} };
  const gate = serpGate(w, plan, force);
  if (!gate.ok) return { skip: true, note: gate.note, extraLines: [], patch: {} };
  return {
    offer: (await searchHotels(w.params, { bypassCache: force })).offers[0],
    note: plan ? `每 ${plan.spacingHours} 小時向 Google 查價一次` : null,
    extraLines: [],
    usedSerp: 'hotel',
    patch: {},
  };
}

/**
 * 機票：有 Travelpayouts 時先用免費的快取價格當雷達，
 * 只有看起來達標 / 降價時才花一次 SerpApi 向 Google 確認，確認是真的才通知。
 */
async function pickFlight(w: FlightWatch, force: boolean, plan: SerpPlan | null): Promise<Picked> {
  const radar = env.radarProvider;
  const main = env.flightProvider;
  const paced = main === 'serpapi';
  const pacedNote = plan ? `每 ${plan.spacingHours} 小時向 Google 查價一次` : null;

  // 沒有雷達：每次都用主要來源
  if (radar === main) {
    if (paced) {
      const gate = serpGate(w, plan, force);
      if (!gate.ok) return { skip: true, note: gate.note, extraLines: [], patch: {} };
    }
    return {
      offer: (await searchFlights(w.params, { bypassCache: force })).offers[0],
      note: paced ? pacedNote : null,
      extraLines: [],
      usedSerp: paced ? 'flight' : undefined,
      patch: {},
    };
  }

  const radarOffer = (await searchFlights(w.params, { bypassCache: force, provider: radar })).offers[0];

  // 雷達查不到這條航線：改用主要來源，照額度安排
  if (!radarOffer) {
    if (paced) {
      const gate = serpGate(w, plan, force);
      if (!gate.ok) return { skip: true, note: `快取查不到這條航線，${gate.note}`, extraLines: [], patch: { radarMiss: true } };
    }
    return {
      offer: (await searchFlights(w.params, { bypassCache: true })).offers[0],
      note: paced ? `快取查不到這條航線，${pacedNote}` : null,
      extraLines: [],
      usedSerp: paced ? 'fallback' : undefined,
      patch: { radarMiss: true },
    };
  }

  const rp = radarOffer.price;
  const radarNote = `每 ${intervalLabel(w.intervalMin)}用快取盯價，發現低價才向 Google 確認`;
  const basePatch: WatchPatch = { radarMiss: false };
  const recentGoogle = w.lastResult?.source === main && !!w.lastSerpAt && Date.now() - Date.parse(w.lastSerpAt) < 24 * HOUR;
  // 這個快取低價最近已經被 Google 否定過：不再重複確認
  const refuted = recentGoogle && w.radarFloor != null && rp >= w.radarFloor;
  const looksGood =
    !refuted &&
    ((w.targetPrice != null && rp <= w.targetPrice) ||
      (w.notifyOnDrop && w.lastPrice != null && rp <= w.lastPrice * (1 - w.dropPercent / 100)) ||
      (w.notifyOnDrop && w.lowestPrice != null && rp < w.lowestPrice));

  if (!looksGood) {
    // 近期有 Google 確認過的價格就繼續顯示它，不用快取價覆蓋
    if (recentGoogle) {
      return {
        skip: true,
        note: refuted ? `快取價 ${fmtPrice(rp)} 已和 Google 比對過，以 Google 價格為準` : radarNote,
        extraLines: [],
        patch: basePatch,
      };
    }
    return { offer: radarOffer, note: radarNote, extraLines: [], patch: basePatch };
  }

  if (paced) {
    const gate = serpGate(w, plan, force);
    if (!gate.ok) return { skip: true, note: `快取發現可能的低價 ${fmtPrice(rp)}，等向 Google 確認：${gate.note}`, extraLines: [], patch: basePatch };
  }
  const usedSerp = paced ? 'confirm' : undefined;
  try {
    const confirmed = (await searchFlights(w.params, { bypassCache: true })).offers[0];
    if (!confirmed) return { offer: radarOffer, note: radarNote, extraLines: ['主要來源查無此航班，以下為 Aviasales 快取價格'], usedSerp, patch: basePatch };
    // Google 價格比快取高：記住這個快取低價，之後同樣的快取價就不再重複確認
    return { offer: confirmed, note: radarNote, extraLines: [], usedSerp, patch: { ...basePatch, radarFloor: confirmed.price > rp ? rp : null } };
  } catch (e) {
    return { offer: radarOffer, note: radarNote, extraLines: [`價格確認失敗（${errMsg(e)}），以下為 Aviasales 快取價格`], usedSerp, patch: basePatch };
  }
}

export async function checkWatch(w: Watch, opts: { force?: boolean; plan?: SerpPlan | null } = {}): Promise<CheckOutcome> {
  const now = new Date().toISOString();
  const force = !!opts.force;
  const outcome: CheckOutcome = { id: w.id, title: w.title, price: null, notified: false, reason: null, error: null, skipped: false, note: null, channels: [] };
  try {
    const plan = opts.plan !== undefined ? opts.plan : await serpPlan(await listWatches());
    const picked = w.type === 'flight' ? await pickFlight(w, force, plan) : await pickHotel(w, force, plan);
    if (picked.usedSerp) {
      await recordSerpCall(picked.usedSerp, w.id).catch(() => undefined);
      if (plan) plan.usedToday++;
    }
    const common: WatchPatch = {
      lastCheckedAt: now,
      note: picked.note,
      ...picked.patch,
      ...(picked.usedSerp ? { lastSerpAt: now } : {}),
    };
    outcome.note = picked.note;

    if (picked.skip) {
      // 延後不是錯誤：保留上次真正查價的錯誤，只清掉舊版把「延後」記成錯誤的訊息
      await updateWatch(w.id, { ...common, ...(w.lastError?.startsWith('快取暫無此航線') ? { lastError: null } : {}) });
      outcome.skipped = true;
      return outcome;
    }
    const offer = picked.offer;
    if (!offer) {
      await updateWatch(w.id, { ...common, lastError: '查無報價' });
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
      payload.lines.push(...picked.extraLines);
      if (offer.source === 'travelpayouts' && !picked.extraLines.length) payload.lines.push('此為 Aviasales 快取價格，請以訂票網站為準');
      const channels = await notifyAll(payload);
      await createAlert({ watchId: w.id, title: payload.title, body: payloadText(payload), price, url: payload.url, channels });
      outcome.notified = true;
      outcome.reason = reason;
      outcome.channels = channels;
    }

    await updateWatch(w.id, {
      ...common,
      lastPrice: price,
      lowestPrice: lowest == null ? price : Math.min(lowest, price),
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

export function isDue(w: Watch, now = Date.now()): boolean {
  if (!w.active) return false;
  if (!w.lastCheckedAt) return true;
  const intervalMs = w.intervalMin * 60000;
  const grace = Math.min(90_000, intervalMs * 0.3);
  return Date.parse(w.lastCheckedAt) + intervalMs - grace <= now;
}

/** 依序檢查到期的追蹤；最久沒向 Google 查價的排前面，額度快用完時優先照顧它們 */
export async function runDueWatches(opts: { force?: boolean } = {}): Promise<CheckOutcome[]> {
  const all = await listWatches();
  const plan = await serpPlan(all);
  const due = all
    .filter((w) => (opts.force ? w.active : isDue(w)))
    .sort((a, b) => (a.lastSerpAt ?? '').localeCompare(b.lastSerpAt ?? ''));
  const out: CheckOutcome[] = [];
  for (const w of due) out.push(await checkWatch(w, { force: opts.force, plan }));
  return out;
}
