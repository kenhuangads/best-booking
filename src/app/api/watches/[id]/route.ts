import { fail, ok, readJson } from '@/lib/api';
import { errMsg } from '@/lib/env';
import { clearHistory, deleteWatch, getWatch, updateWatch, type WatchPatch } from '@/lib/repo';
import { parseFlightQuery, parseHotelQuery, watchPatchSchema } from '@/lib/schemas';
import { checkWatch } from '@/lib/watcher';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const watch = await getWatch(id);
  return watch ? ok({ watch }) : fail('找不到此追蹤', 404);
}

export async function PATCH(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const current = await getWatch(id);
  if (!current) return fail('找不到此追蹤', 404);
  const parsed = watchPatchSchema.safeParse(await readJson(req));
  if (!parsed.success) return fail(parsed.error.issues.map((i) => i.message).join('；'));
  const { params: rawParams, ...rest } = parsed.data;

  let patch: WatchPatch = { ...rest };
  let paramsChanged = false;
  if (rawParams) {
    const p = current.type === 'flight' ? parseFlightQuery(rawParams) : parseHotelQuery(rawParams);
    if (!p.ok) return fail(p.error);
    if (JSON.stringify(p.value) !== JSON.stringify(current.params)) {
      paramsChanged = true;
      // 換了日期等條件：舊價格與通知紀錄都不再適用，重新開始
      patch = {
        ...patch,
        params: p.value,
        lastPrice: null,
        lowestPrice: null,
        lastResult: null,
        lastNotifiedAt: null,
        lastNotifiedPrice: null,
        lastError: null,
        note: null,
        radarMiss: false,
        radarFloor: null,
        lastCheckedAt: null,
      };
    }
  }

  try {
    await updateWatch(id, patch);
    if (paramsChanged) {
      await clearHistory(id);
      const fresh = await getWatch(id);
      // 使用者親手改的，馬上查一次新日期的價格
      if (fresh) await checkWatch(fresh, { force: true });
    }
    return ok({ watch: await getWatch(id) });
  } catch (e) {
    return fail(`更新失敗：${errMsg(e)}`, 500);
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  return (await deleteWatch(id)) ? ok({ ok: true }) : fail('找不到此追蹤', 404);
}
