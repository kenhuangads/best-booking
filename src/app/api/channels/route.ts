import { fail, ok } from '@/lib/api';
import { errMsg } from '@/lib/env';
import { listChannels } from '@/lib/repo';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const channels = (await listChannels()).map((c) => ({
      ...c,
      target: c.target.length > 8 ? `${c.target.slice(0, 4)}…${c.target.slice(-3)}` : c.target,
    }));
    return ok({ channels });
  } catch (e) {
    return fail(`資料庫連線失敗：${errMsg(e)}`, 500);
  }
}
