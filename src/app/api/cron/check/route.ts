import type { NextRequest } from 'next/server';
import { fail, ok } from '@/lib/api';
import { env, errMsg } from '@/lib/env';
import { runDueWatches } from '@/lib/watcher';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * 給外部排程呼叫（Vercel Cron、cron-job.org、GitHub Actions…）：
 *   GET /api/cron/check?key=<CRON_SECRET>          只檢查到期的追蹤
 *   GET /api/cron/check?key=<CRON_SECRET>&force=1  強制檢查全部
 * Vercel Cron 會自動帶 Authorization: Bearer <CRON_SECRET>。
 */
async function handle(req: NextRequest) {
  if (env.cronSecret) {
    const key = req.nextUrl.searchParams.get('key') ?? req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? '';
    if (key !== env.cronSecret) return fail('CRON_SECRET 不符', 401);
  }
  const force = req.nextUrl.searchParams.get('force') === '1';
  try {
    const outcomes = await runDueWatches({ force });
    return ok({
      checked: outcomes.length,
      notified: outcomes.filter((o) => o.notified).length,
      skipped: outcomes.filter((o) => o.skipped).length,
      errors: outcomes.filter((o) => o.error).length,
      outcomes,
    });
  } catch (e) {
    return fail(`檢查失敗：${errMsg(e)}`, 500);
  }
}

export const GET = handle;
export const POST = handle;
