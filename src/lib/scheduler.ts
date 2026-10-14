import { handleTelegramUpdate } from './bot';
import { env, errMsg } from './env';
import { tgGetUpdates } from './notify/telegram';
import { getSetting, setSetting } from './repo';
import { runDueWatches } from './watcher';

interface SchedState {
  started: boolean;
  lastTickAt: string | null;
  lastRunSummary: string | null;
  ticking: boolean;
  polling: boolean;
}

declare global {
  // eslint-disable-next-line no-var
  var __bbSched: SchedState | undefined;
}

export function startScheduler(): void {
  if (globalThis.__bbSched?.started) return;
  const st: SchedState = { started: true, lastTickAt: null, lastRunSummary: null, ticking: false, polling: false };
  globalThis.__bbSched = st;

  if (env.isServerless) {
    console.log('[scheduler] 無伺服器環境：內建排程停用，請用外部 cron 呼叫 /api/cron/check');
    return;
  }

  if (env.schedulerEnabled) {
    const tick = async () => {
      if (st.ticking) return;
      st.ticking = true;
      try {
        const out = await runDueWatches();
        st.lastTickAt = new Date().toISOString();
        if (out.length) {
          const notified = out.filter((o) => o.notified).length;
          const errors = out.filter((o) => o.error).length;
          st.lastRunSummary = `檢查 ${out.length} 筆，通知 ${notified} 筆${errors ? `，${errors} 筆錯誤` : ''}`;
          console.log(`[scheduler] ${st.lastRunSummary}`);
        } else {
          st.lastRunSummary = '沒有到期的追蹤';
        }
      } catch (e) {
        st.lastRunSummary = `錯誤：${errMsg(e)}`;
        console.error('[scheduler]', e);
      } finally {
        st.ticking = false;
      }
    };
    setTimeout(tick, 8000);
    setInterval(tick, env.tickSeconds * 1000);
    console.log(`[scheduler] 已啟動，每 ${env.tickSeconds} 秒檢查到期的追蹤`);
  }

  if (env.telegram.configured && env.telegram.polling) {
    const poll = async () => {
      if (st.polling) return;
      st.polling = true;
      try {
        const offset = Number((await getSetting('tg_offset')) ?? '0');
        const updates = await tgGetUpdates(offset);
        for (const u of updates) {
          try {
            await handleTelegramUpdate(u);
          } catch (e) {
            console.error('[telegram]', errMsg(e));
          }
          await setSetting('tg_offset', String(u.update_id + 1));
        }
      } catch (e) {
        console.error('[telegram poll]', errMsg(e));
      } finally {
        st.polling = false;
      }
    };
    setInterval(poll, 4000);
    console.log('[telegram] 輪詢已啟動（TELEGRAM_POLLING=true）');
  }
}

export function schedulerStatus() {
  const st = globalThis.__bbSched;
  return {
    enabled: env.schedulerEnabled,
    started: !!st?.started && env.schedulerEnabled,
    lastTickAt: st?.lastTickAt ?? null,
    lastRunSummary: st?.lastRunSummary ?? null,
    tickSeconds: env.tickSeconds,
  };
}
