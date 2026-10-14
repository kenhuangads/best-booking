/**
 * 登入 Cookie：以 APP_PASSWORD 做 HMAC 簽章，改密碼就會讓所有裝置登出。
 * 只用 Web Crypto，Edge（middleware）與 Node（API）都能使用。
 */
export const SESSION_COOKIE = 'bb_session';
/** 記住這台裝置一年 */
export const SESSION_MAX_AGE = 60 * 60 * 24 * 365;

export async function sessionToken(password: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(password), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode('best-booking-session-v1'));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, '0')).join('');
}

export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** 登入後只允許跳回站內路徑，避免被拿來轉址到外站 */
export function safeNext(next: string | null | undefined): string {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/login')) return '/';
  return next;
}
