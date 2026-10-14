import { fail, ok, readJson } from '@/lib/api';
import { deleteWatch, getWatch, updateWatch } from '@/lib/repo';
import { watchPatchSchema } from '@/lib/schemas';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const watch = await getWatch(id);
  return watch ? ok({ watch }) : fail('找不到此追蹤', 404);
}

export async function PATCH(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  if (!(await getWatch(id))) return fail('找不到此追蹤', 404);
  const parsed = watchPatchSchema.safeParse(await readJson(req));
  if (!parsed.success) return fail(parsed.error.issues.map((i) => i.message).join('；'));
  const watch = await updateWatch(id, parsed.data);
  return ok({ watch });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  return (await deleteWatch(id)) ? ok({ ok: true }) : fail('找不到此追蹤', 404);
}
