import { env } from '../env';
import { fmtPrice } from '../format';
import type { NotifyPayload } from './messages';

const api = (method: string) => `https://api.telegram.org/bot${env.telegram.token}/${method}`;

export const tgEscape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export async function tgCall<T>(method: string, body: unknown): Promise<T> {
  const res = await fetch(api(method), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const j = (await res.json().catch(() => null)) as { ok: boolean; result?: T; description?: string } | null;
  if (!res.ok || !j?.ok) throw new Error(`Telegram API ${res.status}: ${j?.description ?? 'unknown error'}`);
  return j.result as T;
}

export async function tgSendText(chatId: string, html: string, buttons?: { text: string; url: string }[]): Promise<void> {
  await tgCall('sendMessage', {
    chat_id: chatId,
    text: html.slice(0, 4000),
    parse_mode: 'HTML',
    disable_web_page_preview: true,
    ...(buttons?.length ? { reply_markup: { inline_keyboard: [buttons] } } : {}),
  });
}

export function payloadHtml(p: NotifyPayload): string {
  const lines = [`<b>${tgEscape(p.title)}</b>`, tgEscape(p.subtitle)];
  if (p.price != null) lines.push(`💰 <b>${tgEscape(fmtPrice(p.price, p.currency))}</b>`);
  if (p.reason) lines.push(tgEscape(p.reason));
  if (p.lines.length) lines.push('', ...p.lines.map(tgEscape));
  return lines.join('\n');
}

const publicUrl = (u: string | null): u is string => !!u && /^https?:\/\//.test(u) && !/localhost|127\.0\.0\.1|\[::1\]/.test(u);

export async function sendTelegram(chatId: string, p: NotifyPayload): Promise<void> {
  const buttons: { text: string; url: string }[] = [];
  if (publicUrl(p.url)) buttons.push({ text: '前往預訂', url: p.url });
  if (publicUrl(p.appUrl)) buttons.push({ text: '追蹤清單', url: p.appUrl });
  await tgSendText(chatId, payloadHtml(p), buttons);
}

export interface TgUpdate {
  update_id: number;
  message?: {
    message_id: number;
    text?: string;
    chat: { id: number; type: string; first_name?: string; username?: string; title?: string };
    from?: { first_name?: string; last_name?: string; username?: string };
  };
}

export async function tgGetUpdates(offset: number): Promise<TgUpdate[]> {
  return tgCall<TgUpdate[]>('getUpdates', { offset, timeout: 0, allowed_updates: ['message'] });
}
