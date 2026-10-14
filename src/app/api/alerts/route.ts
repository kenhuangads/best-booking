import { fail, ok } from '@/lib/api';
import { errMsg } from '@/lib/env';
import { listAlerts } from '@/lib/repo';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    return ok({ alerts: await listAlerts(100) });
  } catch (e) {
    return fail(`資料庫連線失敗：${errMsg(e)}`, 500);
  }
}
