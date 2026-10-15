/**
 * SerpApi 額度控管：每月額度留 30% 給手動搜尋，其餘 70% 平均分給需要定期向 Google 查價的追蹤。
 *
 *   每天自動查價上限 = 每月額度 × 70% ÷ 30
 *   每筆追蹤的查價間隔 = 24 小時 × 追蹤筆數 ÷ 每天上限（1 到 24 小時之間）
 *
 * 例：每月 250 次 → 每天 5 次；1 筆每 5 小時、2 筆每 10 小時、5 筆以上每天 1 次。
 */
import { env } from './env';
import { serpAccount } from './providers/serpapi';
import { spacingFor } from './quotaMath';
import { countSerpCalls } from './repo';
import type { SerpPlanInfo, Watch } from './types';

export { spacingFor };

const AUTO_SHARE = 0.7;

export type SerpPlan = SerpPlanInfo;

/** 這筆追蹤的定期檢查需要用到 SerpApi 嗎：住宿、沒有雷達或雷達查不到的機票 */
export function needsSerp(w: Watch): boolean {
  if (w.type === 'hotel') return env.hotelProvider === 'serpapi';
  if (env.flightProvider !== 'serpapi') return false;
  return env.radarProvider === 'serpapi' || w.radarMiss;
}

export async function serpPlan(watches: Watch[]): Promise<SerpPlan | null> {
  if (!env.serpapi.configured) return null;
  const account = await serpAccount();
  const monthlyQuota = account?.quota || env.serpapi.monthlyQuota;
  const dailyCap = Math.max(1, Math.floor((monthlyQuota * AUTO_SHARE) / 30));
  const dependentCount = watches.filter((w) => w.active && needsSerp(w)).length;
  const usedToday = await countSerpCalls(new Date(Date.now() - 24 * 3600 * 1000).toISOString()).catch(() => 0);
  const left = account ? account.left : null;
  return {
    monthlyQuota,
    dailyCap,
    dependentCount,
    spacingHours: spacingFor(dependentCount, dailyCap),
    usedToday,
    used: account ? account.used : null,
    left,
    // 剩餘額度過低時暫停自動查價，保留給手動搜尋
    paused: left != null && left <= Math.max(10, Math.round(monthlyQuota * 0.1)),
  };
}
