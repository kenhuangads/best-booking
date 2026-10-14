import { fail, ok } from '@/lib/api';
import { handleLineEvent, type LineEvent } from '@/lib/bot';
import { env, errMsg } from '@/lib/env';
import { verifyLineSignature } from '@/lib/notify/line';

export const dynamic = 'force-dynamic';

/** LINE Developers Console 的 Webhook URL：https://<你的網域>/api/line/webhook */
export async function POST(req: Request) {
  if (!env.line.configured) return fail('LINE 尚未設定', 503);
  const raw = await req.text();
  if (!verifyLineSignature(raw, req.headers.get('x-line-signature'))) return fail('簽章驗證失敗', 401);
  let events: LineEvent[] = [];
  try {
    events = (JSON.parse(raw) as { events?: LineEvent[] }).events ?? [];
  } catch {
    return fail('無法解析內容');
  }
  await Promise.all(
    events.map((ev) =>
      handleLineEvent(ev).catch((e) => {
        console.error('[line webhook]', errMsg(e));
      }),
    ),
  );
  return ok({ ok: true });
}

export async function GET() {
  return ok({ ok: true, hint: 'LINE webhook 端點正常，請在 LINE Developers Console 設定此 URL' });
}
