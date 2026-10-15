import { fail, ok, readJson } from '@/lib/api';
import { flightTitle, hotelTitle } from '@/lib/deeplinks';
import { errMsg } from '@/lib/env';
import { createWatch, getWatch, listWatches } from '@/lib/repo';
import { parseFlightQuery, parseHotelQuery, watchInputSchema } from '@/lib/schemas';
import type { WatchInput } from '@/lib/types';
import { checkWatch } from '@/lib/watcher';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET() {
  try {
    return ok({ watches: await listWatches() });
  } catch (e) {
    return fail(`資料庫連線失敗：${errMsg(e)}`, 500);
  }
}

export async function POST(req: Request) {
  const body = await readJson(req);
  const parsed = watchInputSchema.safeParse(body);
  if (!parsed.success) return fail(parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('；'));
  const input = parsed.data;

  let watchInput: WatchInput & { title: string };
  if (input.type === 'flight') {
    const p = parseFlightQuery(input.params);
    if (!p.ok) return fail(p.error);
    watchInput = { ...input, params: p.value, title: input.title ?? flightTitle(p.value) };
  } else {
    const p = parseHotelQuery(input.params);
    if (!p.ok) return fail(p.error);
    watchInput = { ...input, params: p.value, title: input.title ?? (p.value.hotelName ? p.value.hotelName : hotelTitle(p.value)) };
  }

  try {
    const created = await createWatch(watchInput);
    // 建立後立即檢查一次，讓使用者馬上看到目前價格（使用者親手建立，不受自動查價額度安排限制）
    const outcome = await checkWatch(created, { force: true });
    return ok({ watch: (await getWatch(created.id)) ?? created, outcome }, { status: 201 });
  } catch (e) {
    return fail(`建立追蹤失敗：${errMsg(e)}`, 500);
  }
}
