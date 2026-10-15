import { getDb, newId, nowISO } from './db';
import type {
  AlertRecord,
  Channel,
  ChannelResult,
  ChannelType,
  FlightOffer,
  HotelOffer,
  PricePoint,
  Watch,
  WatchInput,
} from './types';

/* ───────────── watches ───────────── */

interface WatchRow {
  id: string;
  type: string;
  title: string;
  params: string;
  target_price: number | null;
  notify_on_drop: number;
  drop_percent: number;
  interval_min: number;
  active: number;
  last_price: number | null;
  lowest_price: number | null;
  last_checked_at: string | null;
  last_notified_at: string | null;
  last_notified_price: number | null;
  last_result: string | null;
  last_error: string | null;
  note: string | null;
  last_serp_at: string | null;
  radar_miss: number | null;
  radar_floor: number | null;
  created_at: string;
  updated_at: string;
}

function rowToWatch(r: WatchRow, history: PricePoint[] = []): Watch {
  const base = {
    id: r.id,
    title: r.title,
    targetPrice: r.target_price,
    notifyOnDrop: !!r.notify_on_drop,
    dropPercent: r.drop_percent,
    intervalMin: r.interval_min,
    active: !!r.active,
    lastPrice: r.last_price,
    lowestPrice: r.lowest_price,
    lastCheckedAt: r.last_checked_at,
    lastNotifiedAt: r.last_notified_at,
    lastNotifiedPrice: r.last_notified_price,
    lastError: r.last_error,
    note: r.note ?? null,
    lastSerpAt: r.last_serp_at ?? null,
    radarMiss: !!r.radar_miss,
    radarFloor: r.radar_floor ?? null,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    history,
  };
  const params = JSON.parse(r.params);
  const lastResult = r.last_result ? JSON.parse(r.last_result) : null;
  if (r.type === 'hotel') {
    return { ...base, type: 'hotel', params, lastResult: lastResult as HotelOffer | null };
  }
  return { ...base, type: 'flight', params, lastResult: lastResult as FlightOffer | null };
}

interface PointRow {
  watch_id: string;
  price: number;
  currency: string;
  checked_at: string;
}

/** 一次取回多筆追蹤的最近 60 個價格點（避免 N+1 查詢，雲端資料庫延遲較高） */
async function historyMap(ids: string[], limit = 60): Promise<Map<string, PricePoint[]>> {
  const map = new Map<string, PricePoint[]>();
  if (!ids.length) return map;
  const db = await getDb();
  const rows = await db.all<PointRow>(
    `SELECT watch_id, price, currency, checked_at FROM (
       SELECT watch_id, price, currency, checked_at,
              ROW_NUMBER() OVER (PARTITION BY watch_id ORDER BY checked_at DESC) AS rn
       FROM price_points WHERE watch_id IN (${ids.map(() => '?').join(',')})
     ) WHERE rn <= ? ORDER BY checked_at ASC`,
    [...ids, limit],
  );
  for (const r of rows) {
    const list = map.get(r.watch_id) ?? [];
    list.push({ price: r.price, currency: r.currency, checkedAt: r.checked_at });
    map.set(r.watch_id, list);
  }
  return map;
}

export async function listWatches(): Promise<Watch[]> {
  const db = await getDb();
  const rows = await db.all<WatchRow>('SELECT * FROM watches ORDER BY created_at DESC');
  const hist = await historyMap(rows.map((r) => r.id));
  return rows.map((r) => rowToWatch(r, hist.get(r.id) ?? []));
}

export async function getWatch(id: string): Promise<Watch | null> {
  const db = await getDb();
  const row = await db.get<WatchRow>('SELECT * FROM watches WHERE id = ?', [id]);
  if (!row) return null;
  const hist = await historyMap([id]);
  return rowToWatch(row, hist.get(id) ?? []);
}

export async function createWatch(input: WatchInput & { title: string }): Promise<Watch> {
  const db = await getDb();
  const id = newId();
  const now = nowISO();
  await db.run(
    `INSERT INTO watches (id, type, title, params, target_price, notify_on_drop, drop_percent, interval_min, active, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
    [
      id,
      input.type,
      input.title,
      JSON.stringify(input.params),
      input.targetPrice ?? null,
      input.notifyOnDrop === false ? 0 : 1,
      input.dropPercent ?? 5,
      input.intervalMin ?? 60,
      now,
      now,
    ],
  );
  return (await getWatch(id))!;
}

export interface WatchPatch {
  title?: string;
  targetPrice?: number | null;
  notifyOnDrop?: boolean;
  dropPercent?: number;
  intervalMin?: number;
  active?: boolean;
  lastPrice?: number | null;
  lowestPrice?: number | null;
  lastCheckedAt?: string | null;
  lastNotifiedAt?: string | null;
  lastNotifiedPrice?: number | null;
  lastResult?: FlightOffer | HotelOffer | null;
  lastError?: string | null;
  note?: string | null;
  lastSerpAt?: string | null;
  radarMiss?: boolean;
  radarFloor?: number | null;
}

const PATCH_COLUMNS: Record<keyof WatchPatch, string> = {
  title: 'title',
  targetPrice: 'target_price',
  notifyOnDrop: 'notify_on_drop',
  dropPercent: 'drop_percent',
  intervalMin: 'interval_min',
  active: 'active',
  lastPrice: 'last_price',
  lowestPrice: 'lowest_price',
  lastCheckedAt: 'last_checked_at',
  lastNotifiedAt: 'last_notified_at',
  lastNotifiedPrice: 'last_notified_price',
  lastResult: 'last_result',
  lastError: 'last_error',
  note: 'note',
  lastSerpAt: 'last_serp_at',
  radarMiss: 'radar_miss',
  radarFloor: 'radar_floor',
};

export async function updateWatch(id: string, patch: WatchPatch): Promise<Watch | null> {
  const sets: string[] = [];
  const values: unknown[] = [];
  for (const [key, col] of Object.entries(PATCH_COLUMNS) as [keyof WatchPatch, string][]) {
    if (!(key in patch)) continue;
    let v: unknown = patch[key];
    if (typeof v === 'boolean') v = v ? 1 : 0;
    if (key === 'lastResult') v = v == null ? null : JSON.stringify(v);
    sets.push(`${col} = ?`);
    values.push(v ?? null);
  }
  if (sets.length === 0) return getWatch(id);
  sets.push('updated_at = ?');
  values.push(nowISO(), id);
  const db = await getDb();
  await db.run(`UPDATE watches SET ${sets.join(', ')} WHERE id = ?`, values);
  return getWatch(id);
}

export async function deleteWatch(id: string): Promise<boolean> {
  const db = await getDb();
  await db.run('DELETE FROM price_points WHERE watch_id = ?', [id]);
  const r = await db.run('DELETE FROM watches WHERE id = ?', [id]);
  return r.changes > 0;
}

export async function addPricePoint(watchId: string, price: number, currency: string, checkedAt: string): Promise<void> {
  const db = await getDb();
  await db.run('INSERT INTO price_points (watch_id, price, currency, checked_at) VALUES (?, ?, ?, ?)', [watchId, price, currency, checkedAt]);
  // 每筆追蹤只保留最近 500 個價格點
  await db.run(
    `DELETE FROM price_points WHERE watch_id = ? AND id NOT IN (
       SELECT id FROM price_points WHERE watch_id = ? ORDER BY checked_at DESC LIMIT 500)`,
    [watchId, watchId],
  );
}

/* ───────────── channels ───────────── */

interface ChannelRow {
  id: string;
  type: string;
  target: string;
  display_name: string | null;
  enabled: number;
  created_at: string;
}

function rowToChannel(r: ChannelRow): Channel {
  return {
    id: r.id,
    type: r.type as ChannelType,
    target: r.target,
    displayName: r.display_name,
    enabled: !!r.enabled,
    createdAt: r.created_at,
  };
}

export async function listChannels(): Promise<Channel[]> {
  const db = await getDb();
  const rows = await db.all<ChannelRow>('SELECT * FROM channels ORDER BY created_at ASC');
  return rows.map(rowToChannel);
}

export async function upsertChannel(type: ChannelType, target: string, displayName?: string | null): Promise<Channel> {
  const db = await getDb();
  const existing = await db.get<ChannelRow>('SELECT * FROM channels WHERE type = ? AND target = ?', [type, target]);
  if (existing) {
    await db.run('UPDATE channels SET enabled = 1, display_name = COALESCE(?, display_name) WHERE id = ?', [displayName ?? null, existing.id]);
    return rowToChannel({ ...existing, enabled: 1, display_name: displayName ?? existing.display_name });
  }
  const id = newId();
  const now = nowISO();
  await db.run('INSERT INTO channels (id, type, target, display_name, enabled, created_at) VALUES (?, ?, ?, ?, 1, ?)', [id, type, target, displayName ?? null, now]);
  return { id, type, target, displayName: displayName ?? null, enabled: true, createdAt: now };
}

export async function setChannelEnabled(id: string, enabled: boolean): Promise<void> {
  const db = await getDb();
  await db.run('UPDATE channels SET enabled = ? WHERE id = ?', [enabled ? 1 : 0, id]);
}

export async function disableChannelByTarget(type: ChannelType, target: string): Promise<void> {
  const db = await getDb();
  await db.run('UPDATE channels SET enabled = 0 WHERE type = ? AND target = ?', [type, target]);
}

export async function deleteChannel(id: string): Promise<boolean> {
  const db = await getDb();
  return (await db.run('DELETE FROM channels WHERE id = ?', [id])).changes > 0;
}

/* ───────────── link codes ───────────── */

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export async function createLinkCode(type: ChannelType, ttlMin = 10): Promise<{ code: string; expiresAt: string }> {
  const db = await getDb();
  await db.run('DELETE FROM link_codes WHERE expires_at < ?', [nowISO()]);
  let code = '';
  for (let attempt = 0; attempt < 10; attempt++) {
    code = Array.from({ length: 6 }, () => CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]).join('');
    const exists = await db.get('SELECT 1 AS x FROM link_codes WHERE code = ?', [code]);
    if (!exists) break;
  }
  const expiresAt = new Date(Date.now() + ttlMin * 60000).toISOString();
  await db.run('INSERT INTO link_codes (code, type, expires_at) VALUES (?, ?, ?)', [code, type, expiresAt]);
  return { code, expiresAt };
}

export async function consumeLinkCode(code: string, type: ChannelType): Promise<boolean> {
  const db = await getDb();
  const row = await db.get<{ code: string; expires_at: string; used_at: string | null }>('SELECT * FROM link_codes WHERE code = ? AND type = ?', [
    code.toUpperCase(),
    type,
  ]);
  if (!row || row.used_at || row.expires_at < nowISO()) return false;
  await db.run('UPDATE link_codes SET used_at = ? WHERE code = ?', [nowISO(), row.code]);
  return true;
}

/* ───────────── alerts ───────────── */

interface AlertRow {
  id: string;
  watch_id: string | null;
  title: string;
  body: string;
  price: number | null;
  url: string | null;
  channels: string;
  created_at: string;
}

export async function listAlerts(limit = 100): Promise<AlertRecord[]> {
  const db = await getDb();
  const rows = await db.all<AlertRow>('SELECT * FROM alerts ORDER BY created_at DESC LIMIT ?', [limit]);
  return rows.map((r) => ({
    id: r.id,
    watchId: r.watch_id,
    title: r.title,
    body: r.body,
    price: r.price,
    url: r.url,
    channels: JSON.parse(r.channels) as ChannelResult[],
    createdAt: r.created_at,
  }));
}

export async function createAlert(a: {
  watchId: string | null;
  title: string;
  body: string;
  price: number | null;
  url: string | null;
  channels: ChannelResult[];
}): Promise<AlertRecord> {
  const db = await getDb();
  const id = newId();
  const now = nowISO();
  await db.run('INSERT INTO alerts (id, watch_id, title, body, price, url, channels, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [
    id,
    a.watchId,
    a.title,
    a.body,
    a.price,
    a.url,
    JSON.stringify(a.channels),
    now,
  ]);
  await db.run('DELETE FROM alerts WHERE id NOT IN (SELECT id FROM alerts ORDER BY created_at DESC LIMIT 500)');
  return { id, createdAt: now, ...a };
}

/* ───────────── settings ───────────── */

/* ───────────── SerpApi 自動查價紀錄（控管額度用） ───────────── */

export async function recordSerpCall(kind: string, watchId: string | null): Promise<void> {
  const db = await getDb();
  await db.run('INSERT INTO serp_calls (at, kind, watch_id) VALUES (?, ?, ?)', [nowISO(), kind, watchId]);
  await db.run('DELETE FROM serp_calls WHERE at < ?', [new Date(Date.now() - 40 * 86400000).toISOString()]);
}

export async function countSerpCalls(sinceISO: string): Promise<number> {
  const db = await getDb();
  const row = await db.get<{ n: number }>('SELECT COUNT(*) AS n FROM serp_calls WHERE at >= ?', [sinceISO]);
  return Number(row?.n ?? 0);
}

export async function getSetting(key: string): Promise<string | null> {
  const db = await getDb();
  const row = await db.get<{ value: string }>('SELECT value FROM settings WHERE key = ?', [key]);
  return row?.value ?? null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  const db = await getDb();
  await db.run('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value', [key, value]);
}
