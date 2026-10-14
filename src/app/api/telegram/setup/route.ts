import { fail, ok } from '@/lib/api';
import { env, errMsg } from '@/lib/env';
import { tgCall } from '@/lib/notify/telegram';

export const dynamic = 'force-dynamic';

interface WebhookInfo {
  url: string;
  pending_update_count?: number;
  last_error_message?: string;
}

/** 查看目前 Telegram webhook 狀態 */
export async function GET() {
  if (!env.telegram.configured) return fail('尚未設定 TELEGRAM_BOT_TOKEN', 503);
  try {
    const info = await tgCall<WebhookInfo>('getWebhookInfo', {});
    return ok({ url: info.url || null, pendingUpdates: info.pending_update_count ?? 0, lastError: info.last_error_message ?? null });
  } catch (e) {
    return fail(errMsg(e), 502);
  }
}

/** 一鍵把 Telegram webhook 指向本站 /api/telegram/webhook（部署到 Vercel 等無伺服器環境時使用） */
export async function POST() {
  if (!env.telegram.configured) return fail('尚未設定 TELEGRAM_BOT_TOKEN', 503);
  const url = `${env.appUrl}/api/telegram/webhook`;
  if (!url.startsWith('https://')) return fail('APP_URL 必須是 https 網址才能設定 Telegram webhook');
  try {
    await tgCall('setWebhook', {
      url,
      secret_token: env.telegram.webhookSecret || undefined,
      allowed_updates: ['message'],
      drop_pending_updates: true,
    });
    const info = await tgCall<WebhookInfo>('getWebhookInfo', {});
    return ok({ url: info.url, pendingUpdates: info.pending_update_count ?? 0, lastError: info.last_error_message ?? null });
  } catch (e) {
    return fail(errMsg(e), 502);
  }
}
