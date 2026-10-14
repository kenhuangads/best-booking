import { NextRequest, NextResponse } from 'next/server';

/**
 * 設定 APP_PASSWORD 後，整個 App 以 HTTP Basic Auth 保護（帳號可任意填）。
 * Webhook、外部 cron、PWA 資源不需密碼。
 */
const PUBLIC_PREFIXES = ['/api/line/', '/api/telegram/', '/api/cron/', '/icons/', '/manifest.webmanifest', '/favicon'];

export function middleware(req: NextRequest) {
  const password = process.env.APP_PASSWORD;
  if (!password) return NextResponse.next();
  const { pathname } = req.nextUrl;
  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) return NextResponse.next();

  const auth = req.headers.get('authorization') ?? '';
  if (auth.startsWith('Basic ')) {
    try {
      const decoded = atob(auth.slice(6));
      const idx = decoded.indexOf(':');
      const supplied = idx >= 0 ? decoded.slice(idx + 1) : decoded;
      if (supplied === password) return NextResponse.next();
    } catch {
      /* fallthrough */
    }
  }
  return new NextResponse('需要密碼才能使用旅行預訂神器', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="best-booking", charset="UTF-8"', 'Content-Type': 'text/plain; charset=utf-8' },
  });
}

export const config = {
  matcher: ['/((?!_next/static|_next/image).*)'],
};
