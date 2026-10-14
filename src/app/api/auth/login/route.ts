import type { NextRequest } from 'next/server';
import { fail, ok, readJson } from '@/lib/api';
import { SESSION_COOKIE, SESSION_MAX_AGE, safeEqual, sessionToken } from '@/lib/auth';
import { getDb, nowISO, type DbAdapter } from '@/lib/db';
import { env } from '@/lib/env';

export const dynamic = 'force-dynamic';

/** 同一個 IP 15 分鐘內最多錯 10 次 */
const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILS = 10;

function clientIp(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown';
}

export async function POST(req: NextRequest) {
  const password = env.appPassword;
  if (!password) return ok({ ok: true });
  const ip = clientIp(req);

  let db: DbAdapter | null = null;
  try {
    db = await getDb();
    const since = new Date(Date.now() - WINDOW_MS).toISOString();
    const row = await db.get<{ n: number }>('SELECT COUNT(*) AS n FROM login_attempts WHERE ip = ? AND at > ?', [ip, since]);
    if (Number(row?.n ?? 0) >= MAX_FAILS) return fail('嘗試太多次，請 15 分鐘後再試', 429);
  } catch {
    db = null; // 資料庫暫時不可用時不做次數限制，仍可登入
  }

  const body = (await readJson(req)) as { password?: unknown } | null;
  const supplied = typeof body?.password === 'string' ? body.password : '';
  if (!safeEqual(supplied, password)) {
    if (db) {
      await db.run('INSERT INTO login_attempts (ip, at) VALUES (?, ?)', [ip, nowISO()]).catch(() => undefined);
      await db.run('DELETE FROM login_attempts WHERE at < ?', [new Date(Date.now() - 24 * 3600 * 1000).toISOString()]).catch(() => undefined);
    }
    await new Promise((r) => setTimeout(r, 700));
    return fail('密碼不正確', 401);
  }

  if (db) await db.run('DELETE FROM login_attempts WHERE ip = ?', [ip]).catch(() => undefined);
  const res = ok({ ok: true });
  res.cookies.set(SESSION_COOKIE, await sessionToken(password), {
    httpOnly: true,
    secure: req.nextUrl.protocol === 'https:',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  });
  return res;
}
