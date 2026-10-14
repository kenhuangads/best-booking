import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE, SESSION_MAX_AGE, safeEqual, sessionToken } from './lib/auth';

/**
 * 設定 APP_PASSWORD 後需要登入。登入後以 Cookie 記住這台裝置一年，加到主畫面的 App 也適用。
 * 登入頁、Webhook、外部 cron 與 PWA 資源不需登入。
 */
const PUBLIC_PREFIXES = ['/login', '/api/auth/', '/api/line/', '/api/telegram/', '/api/cron/', '/icons/', '/manifest.webmanifest', '/favicon'];

function basicPassword(req: NextRequest): string | null {
  const auth = req.headers.get('authorization') ?? '';
  if (!auth.startsWith('Basic ')) return null;
  try {
    const decoded = atob(auth.slice(6));
    const idx = decoded.indexOf(':');
    return idx >= 0 ? decoded.slice(idx + 1) : decoded;
  } catch {
    return null;
  }
}

export async function middleware(req: NextRequest) {
  const password = process.env.APP_PASSWORD;
  if (!password) return NextResponse.next();
  const { pathname, search } = req.nextUrl;
  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) return NextResponse.next();

  const token = await sessionToken(password);
  const cookie = req.cookies.get(SESSION_COOKIE)?.value;
  if (cookie && safeEqual(cookie, token)) return NextResponse.next();

  // 舊的 HTTP 帳密（瀏覽器記住的、或 curl）仍可使用，並順便換成 Cookie
  const basic = basicPassword(req);
  if (basic != null && safeEqual(basic, password)) {
    const res = NextResponse.next();
    res.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: req.nextUrl.protocol === 'https:',
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_MAX_AGE,
    });
    return res;
  }

  if (pathname.startsWith('/api/')) return NextResponse.json({ error: '需要登入' }, { status: 401 });
  const url = req.nextUrl.clone();
  url.pathname = '/login';
  url.search = pathname === '/' && !search ? '' : `?next=${encodeURIComponent(pathname + search)}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image).*)'],
};
