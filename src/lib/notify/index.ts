import { env, errMsg } from '../env';
import { listChannels } from '../repo';
import type { ChannelResult } from '../types';
import { sendLine } from './line';
import type { NotifyPayload } from './messages';
import { sendTelegram } from './telegram';

/** 傳送到所有已啟用的通知管道，回傳各管道結果（不丟錯） */
export async function notifyAll(p: NotifyPayload): Promise<ChannelResult[]> {
  const channels = (await listChannels()).filter((c) => c.enabled);
  const results: ChannelResult[] = [];
  for (const c of channels) {
    try {
      if (c.type === 'line') {
        if (!env.line.configured) throw new Error('LINE 尚未設定');
        await sendLine(c.target, p);
      } else if (c.type === 'telegram') {
        if (!env.telegram.configured) throw new Error('Telegram 尚未設定');
        await sendTelegram(c.target, p);
      }
      results.push({ type: c.type, target: c.target, ok: true });
    } catch (e) {
      results.push({ type: c.type, target: c.target, ok: false, error: errMsg(e) });
    }
  }
  return results;
}
