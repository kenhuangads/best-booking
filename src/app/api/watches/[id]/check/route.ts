import { fail, ok } from '@/lib/api';
import { getWatch } from '@/lib/repo';
import { checkWatch } from '@/lib/watcher';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const watch = await getWatch(id);
  if (!watch) return fail('找不到此追蹤', 404);
  const outcome = await checkWatch(watch, { force: true });
  return ok({ outcome, watch: await getWatch(id) });
}
