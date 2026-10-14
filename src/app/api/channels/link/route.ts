import { fail, ok, readJson } from '@/lib/api';
import { env, errMsg } from '@/lib/env';
import { createLinkCode } from '@/lib/repo';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const body = (await readJson(req)) as { type?: unknown } | null;
  const type = body?.type;
  if (type !== 'line' && type !== 'telegram') return fail('type 須為 line 或 telegram');
  if (type === 'line' && !env.line.configured) return fail('尚未設定 LINE_CHANNEL_ACCESS_TOKEN / LINE_CHANNEL_SECRET', 503);
  if (type === 'telegram' && !env.telegram.configured) return fail('尚未設定 TELEGRAM_BOT_TOKEN', 503);
  try {
    const { code, expiresAt } = await createLinkCode(type);
    return ok({
      type,
      code,
      expiresAt,
      addFriendUrl: type === 'line' ? env.line.addFriendUrl : null,
      telegramUrl: type === 'telegram' && env.telegram.username ? `https://t.me/${env.telegram.username}?start=${code}` : null,
    });
  } catch (e) {
    return fail(`資料庫連線失敗：${errMsg(e)}`, 500);
  }
}
