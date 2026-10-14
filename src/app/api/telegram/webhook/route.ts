import { fail, ok, readJson } from '@/lib/api';
import { handleTelegramUpdate } from '@/lib/bot';
import { env, errMsg } from '@/lib/env';
import type { TgUpdate } from '@/lib/notify/telegram';

export const dynamic = 'force-dynamic';

/**
 * Telegram webhook（部署到公網後使用；本機開發請用 TELEGRAM_POLLING=true）：
 * https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://<你的網域>/api/telegram/webhook&secret_token=<TELEGRAM_WEBHOOK_SECRET>
 */
export async function POST(req: Request) {
  if (!env.telegram.configured) return fail('Telegram 尚未設定', 503);
  if (env.telegram.webhookSecret && req.headers.get('x-telegram-bot-api-secret-token') !== env.telegram.webhookSecret) {
    return fail('secret token 不符', 401);
  }
  const update = (await readJson(req)) as TgUpdate | null;
  if (!update) return fail('無法解析內容');
  try {
    await handleTelegramUpdate(update);
  } catch (e) {
    console.error('[telegram webhook]', errMsg(e));
  }
  return ok({ ok: true });
}
