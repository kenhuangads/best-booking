/**
 * LINE / Telegram 機器人共用的指令處理：連結碼綁定、查看追蹤清單、說明。
 */
import { fmtPrice } from './format';
import { lineProfile, lineReply } from './notify/line';
import { watchSubtitle } from './notify/messages';
import { tgEscape, tgSendText, type TgUpdate } from './notify/telegram';
import { consumeLinkCode, disableChannelByTarget, listWatches, upsertChannel } from './repo';
import type { ChannelType } from './types';

const HELP =
  '嗨，我是旅行預訂神器 🤖\n\n' +
  '• 傳送 App「設定 → 通知」裡的 6 碼連結碼，即可在這裡收到最低價通知\n' +
  '• 輸入「追蹤」查看目前追蹤清單\n' +
  '• 輸入「說明」再次顯示這段訊息';

export function extractCode(text: string): string | null {
  const t = text
    .trim()
    .toUpperCase()
    .replace(/^\/START\s*/i, '')
    .replace(/^(連結|綁定|LINK|CODE)[\s:：]*/u, '')
    .replace(/\s+/g, '');
  return /^[A-Z0-9]{6}$/.test(t) ? t : null;
}

export async function handleBotText(type: ChannelType, target: string, text: string, displayName?: string | null): Promise<string> {
  const t = text.trim();
  const code = extractCode(t);
  if (code) {
    if (await consumeLinkCode(code, type)) {
      await upsertChannel(type, target, displayName ?? null);
      return '✅ 連結成功！之後機票、住宿的最低價 / 降價通知會傳到這裡。\n\n輸入「追蹤」可隨時查看追蹤清單。';
    }
    return '❌ 連結碼無效或已過期（有效 10 分鐘），請回到 App 的「設定 → 通知」重新取得。';
  }

  if (/^(追蹤|清單|list|watches|狀態|status)$/i.test(t)) {
    const ws = (await listWatches()).filter((w) => w.active);
    if (!ws.length) return '目前沒有進行中的追蹤。到 App 搜尋機票或住宿後，點「追蹤最低價」即可新增。';
    const lines = ws.slice(0, 8).map((w) => {
      const icon = w.type === 'flight' ? '✈️' : '🏨';
      const now = w.lastPrice != null ? fmtPrice(w.lastPrice) : '尚未檢查';
      const target = w.targetPrice != null ? ` / 目標 ${fmtPrice(w.targetPrice)}` : '';
      const hit = w.targetPrice != null && w.lastPrice != null && w.lastPrice <= w.targetPrice ? ' 🎯' : '';
      return `${icon} ${w.title}\n　${watchSubtitle(w)}\n　目前 ${now}${target}${hit}`;
    });
    return `📋 追蹤中 ${ws.length} 筆\n\n${lines.join('\n\n')}${ws.length > 8 ? '\n\n…更多請到 App 查看' : ''}`;
  }

  return HELP;
}

/* ───────────── LINE ───────────── */

export interface LineEvent {
  type: string;
  replyToken?: string;
  source?: { userId?: string; type: string };
  message?: { type: string; text?: string };
}

export async function handleLineEvent(ev: LineEvent): Promise<void> {
  const userId = ev.source?.userId;
  if (!userId) return;
  if (ev.type === 'unfollow') {
    await disableChannelByTarget('line', userId);
    return;
  }
  if (ev.type === 'follow' && ev.replyToken) {
    await lineReply(ev.replyToken, [
      { type: 'text', text: '感謝加入！🎉\n\n請到旅行預訂神器 App 的「設定 → 通知」取得 6 碼連結碼，直接傳給我就完成綁定。' },
    ]);
    return;
  }
  if (ev.type === 'message' && ev.message?.type === 'text' && ev.replyToken) {
    const profile = await lineProfile(userId);
    const reply = await handleBotText('line', userId, ev.message.text ?? '', profile?.displayName);
    await lineReply(ev.replyToken, [{ type: 'text', text: reply }]);
  }
}

/* ───────────── Telegram ───────────── */

export async function handleTelegramUpdate(u: TgUpdate): Promise<void> {
  const msg = u.message;
  if (!msg?.text) return;
  const chatId = String(msg.chat.id);
  const name = [msg.from?.first_name, msg.from?.last_name].filter(Boolean).join(' ') || msg.chat.title || msg.from?.username || null;
  const reply = await handleBotText('telegram', chatId, msg.text, name);
  await tgSendText(chatId, tgEscape(reply));
}
