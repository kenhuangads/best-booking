import { fail, ok, readJson } from '@/lib/api';
import { deleteChannel, listChannels, setChannelEnabled } from '@/lib/repo';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  if (!(await listChannels()).some((c) => c.id === id)) return fail('找不到此通知管道', 404);
  const body = (await readJson(req)) as { enabled?: unknown } | null;
  if (typeof body?.enabled !== 'boolean') return fail('enabled 須為布林值');
  await setChannelEnabled(id, body.enabled);
  return ok({ ok: true });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  return (await deleteChannel(id)) ? ok({ ok: true }) : fail('找不到此通知管道', 404);
}
