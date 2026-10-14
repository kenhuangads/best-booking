import { fail, ok } from '@/lib/api';
import { notifyAll } from '@/lib/notify';
import { buildTestPayload, payloadText } from '@/lib/notify/messages';
import { createAlert, listChannels } from '@/lib/repo';

export const dynamic = 'force-dynamic';

export async function POST() {
  if (!(await listChannels()).some((c) => c.enabled)) return fail('尚未連結任何通知管道', 409);
  const payload = buildTestPayload();
  const channels = await notifyAll(payload);
  await createAlert({ watchId: null, title: payload.title, body: payloadText(payload), price: null, url: null, channels });
  return ok({ channels });
}
