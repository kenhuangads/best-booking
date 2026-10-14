/**
 * 資料層：本機 / Docker 使用 better-sqlite3（檔案），
 * 無伺服器部署（Vercel 等）可改用 Turso / libSQL 雲端資料庫（設定 TURSO_DATABASE_URL）。
 * 兩者共用同一個簡單的 async adapter 介面。
 */
import fs from 'node:fs';
import path from 'node:path';
import { env } from './env';

export type DbBackend = 'sqlite' | 'turso';

export interface DbAdapter {
  backend: DbBackend;
  /** 資料是否會在重新部署 / 重啟後保留 */
  persistent: boolean;
  location: string;
  all<T = Record<string, unknown>>(sql: string, args?: unknown[]): Promise<T[]>;
  get<T = Record<string, unknown>>(sql: string, args?: unknown[]): Promise<T | undefined>;
  run(sql: string, args?: unknown[]): Promise<{ changes: number }>;
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS watches (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  params TEXT NOT NULL,
  target_price INTEGER,
  notify_on_drop INTEGER NOT NULL DEFAULT 1,
  drop_percent REAL NOT NULL DEFAULT 5,
  interval_min INTEGER NOT NULL DEFAULT 60,
  active INTEGER NOT NULL DEFAULT 1,
  last_price INTEGER,
  lowest_price INTEGER,
  last_checked_at TEXT,
  last_notified_at TEXT,
  last_notified_price INTEGER,
  last_result TEXT,
  last_error TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS price_points (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  watch_id TEXT NOT NULL,
  price INTEGER NOT NULL,
  currency TEXT NOT NULL,
  checked_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_price_points_watch ON price_points(watch_id, checked_at);
CREATE TABLE IF NOT EXISTS channels (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  target TEXT NOT NULL,
  display_name TEXT,
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  UNIQUE(type, target)
);
CREATE TABLE IF NOT EXISTS link_codes (
  code TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used_at TEXT
);
CREATE TABLE IF NOT EXISTS alerts (
  id TEXT PRIMARY KEY,
  watch_id TEXT,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  price INTEGER,
  url TEXT,
  channels TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_alerts_created ON alerts(created_at);
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`;

declare global {
  // eslint-disable-next-line no-var
  var __bbDb: Promise<DbAdapter> | undefined;
}

async function createSqlite(): Promise<DbAdapter> {
  const { default: Database } = await import('better-sqlite3');
  const file = env.sqlitePath;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const conn = new Database(file);
  conn.pragma('journal_mode = WAL');
  conn.exec(SCHEMA);
  return {
    backend: 'sqlite',
    persistent: !env.isServerless,
    location: file,
    async all<T>(sql: string, args: unknown[] = []) {
      return conn.prepare(sql).all(...args) as T[];
    },
    async get<T>(sql: string, args: unknown[] = []) {
      return conn.prepare(sql).get(...args) as T | undefined;
    },
    async run(sql: string, args: unknown[] = []) {
      const info = conn.prepare(sql).run(...args);
      return { changes: info.changes };
    },
  };
}

async function createTurso(): Promise<DbAdapter> {
  const { createClient } = await import('@libsql/client/web');
  type InValue = string | number | bigint | boolean | ArrayBuffer | Uint8Array | Date | null;
  const client = createClient({ url: env.turso.url, authToken: env.turso.token || undefined });
  await client.executeMultiple(SCHEMA);
  const toArgs = (args: unknown[]) => args.map((a) => (a === undefined ? null : a)) as InValue[];
  const rowToObject = (columns: string[], row: Record<string | number, unknown>) => {
    const o: Record<string, unknown> = {};
    columns.forEach((c, i) => {
      const v = row[i];
      o[c] = typeof v === 'bigint' ? Number(v) : v;
    });
    return o;
  };
  return {
    backend: 'turso',
    persistent: true,
    location: env.turso.url.replace(/\?.*$/, ''),
    async all<T>(sql: string, args: unknown[] = []) {
      const r = await client.execute({ sql, args: toArgs(args) });
      return r.rows.map((row) => rowToObject(r.columns, row as unknown as Record<string | number, unknown>)) as T[];
    },
    async get<T>(sql: string, args: unknown[] = []) {
      const r = await client.execute({ sql, args: toArgs(args) });
      const row = r.rows[0];
      return row ? (rowToObject(r.columns, row as unknown as Record<string | number, unknown>) as T) : undefined;
    },
    async run(sql: string, args: unknown[] = []) {
      const r = await client.execute({ sql, args: toArgs(args) });
      return { changes: r.rowsAffected };
    },
  };
}

export function getDb(): Promise<DbAdapter> {
  if (!globalThis.__bbDb) {
    const p = env.turso.configured ? createTurso() : createSqlite();
    globalThis.__bbDb = p.catch((e) => {
      globalThis.__bbDb = undefined;
      throw e;
    });
  }
  return globalThis.__bbDb;
}

export function nowISO(): string {
  return new Date().toISOString();
}

export function newId(): string {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 20);
}
