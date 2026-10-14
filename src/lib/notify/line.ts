import crypto from 'node:crypto';
import { env } from '../env';
import { fmtPrice } from '../format';
import { payloadText, type NotifyPayload } from './messages';

const API = 'https://api.line.me/v2/bot';

async function linePost(path: string, body: unknown): Promise<void> {
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.line.token}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`LINE API ${res.status}: ${text.slice(0, 200)}`);
  }
}

export function verifyLineSignature(rawBody: string, signature: string | null): boolean {
  if (!env.line.secret || !signature) return false;
  const expected = crypto.createHmac('sha256', env.line.secret).update(rawBody).digest('base64');
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export async function linePush(to: string, messages: unknown[]): Promise<void> {
  await linePost('/message/push', { to, messages });
}

export async function lineReply(replyToken: string, messages: unknown[]): Promise<void> {
  await linePost('/message/reply', { replyToken, messages });
}

export async function lineProfile(userId: string): Promise<{ displayName: string } | null> {
  try {
    const res = await fetch(`${API}/profile/${userId}`, { headers: { Authorization: `Bearer ${env.line.token}` } });
    if (!res.ok) return null;
    return (await res.json()) as { displayName: string };
  } catch {
    return null;
  }
}

const isHttps = (u: string | null): u is string => !!u && u.startsWith('https://');

/** LINE Flex Message：價格卡片 */
export function buildFlexMessage(p: NotifyPayload): unknown {
  const priceText = p.price != null ? fmtPrice(p.price, p.currency) : null;
  const text = (t: string, extra: Record<string, unknown> = {}) => ({ type: 'text', text: t || ' ', wrap: true, ...extra });

  const body: unknown[] = [];
  if (priceText) body.push(text(priceText, { size: 'xxl', weight: 'bold', color: '#E8590C' }));
  if (p.reason) body.push(text(p.reason, { size: 'sm', color: '#111111' }));
  if (p.lines.length) {
    body.push({
      type: 'box',
      layout: 'vertical',
      spacing: 'xs',
      margin: 'md',
      contents: p.lines.map((l) => text(l, { size: 'xs', color: '#666666' })),
    });
  }

  const footer: unknown[] = [];
  if (isHttps(p.url)) {
    footer.push({ type: 'button', style: 'primary', color: '#1f4ef5', height: 'sm', action: { type: 'uri', label: '前往預訂', uri: p.url } });
  }
  if (isHttps(p.appUrl)) {
    footer.push({ type: 'button', style: 'link', height: 'sm', action: { type: 'uri', label: '開啟追蹤清單', uri: p.appUrl } });
  }

  const bubble: Record<string, unknown> = {
    type: 'bubble',
    size: 'mega',
    header: {
      type: 'box',
      layout: 'vertical',
      backgroundColor: '#1f4ef5',
      paddingAll: '16px',
      contents: [text(p.title, { color: '#ffffff', weight: 'bold', size: 'md' }), text(p.subtitle, { color: '#dbe6ff', size: 'sm', margin: 'xs' })],
    },
    body: { type: 'box', layout: 'vertical', spacing: 'sm', contents: body.length ? body : [text(' ')] },
  };
  if (footer.length) bubble.footer = { type: 'box', layout: 'vertical', spacing: 'sm', contents: footer };

  return {
    type: 'flex',
    altText: `${p.title}${priceText ? ` ${priceText}` : ''}`.slice(0, 400),
    contents: bubble,
  };
}

export async function sendLine(to: string, p: NotifyPayload): Promise<void> {
  try {
    await linePush(to, [buildFlexMessage(p)]);
  } catch (e) {
    // Flex 格式被拒絕時退回純文字（仍會丟出第二次失敗的錯誤）
    console.warn('[line] Flex 傳送失敗，改用純文字：', e instanceof Error ? e.message : e);
    await linePush(to, [{ type: 'text', text: payloadText(p).slice(0, 4900) }]);
  }
}
