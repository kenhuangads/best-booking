'use client';

import { useEffect, useRef, useState } from 'react';
import useSWR from 'swr';
import { toast } from '@/components/Toast';
import { Card, PageHeader, PrimaryButton, Toggle } from '@/components/ui';
import { api, errText, fetcher } from '@/lib/client';
import { relTime } from '@/lib/format';
import type { Channel, ChannelResult, ChannelType, ProviderName, StatusResponse } from '@/lib/types';

interface LinkInfo {
  type: ChannelType;
  code: string;
  expiresAt: string;
  addFriendUrl: string | null;
  telegramUrl: string | null;
}

export default function SettingsPage() {
  const { data: status } = useSWR<StatusResponse>('/api/status', fetcher, { refreshInterval: 15_000 });
  const [link, setLink] = useState<LinkInfo | null>(null);
  const { data: ch, mutate: mutateCh } = useSWR<{ channels: Channel[] }>('/api/channels', fetcher, { refreshInterval: link ? 3_000 : 0 });
  const channels = ch?.channels ?? [];
  const [testing, setTesting] = useState(false);
  const [checkingAll, setCheckingAll] = useState(false);
  const [settingWebhook, setSettingWebhook] = useState(false);

  // 連結中：偵測到同類型的新管道就完成
  const linkedCount = useRef<number>(0);
  useEffect(() => {
    if (!link) return;
    const count = channels.filter((c) => c.type === link.type).length;
    if (count > linkedCount.current) {
      toast(`${link.type === 'line' ? 'LINE' : 'Telegram'} 連結成功 🎉`);
      setLink(null);
    }
  }, [channels, link]);

  const startLink = async (type: ChannelType) => {
    linkedCount.current = channels.filter((c) => c.type === type).length;
    try {
      setLink(await api<LinkInfo>('/api/channels/link', { body: { type } }));
    } catch (e) {
      toast(errText(e), 'err');
    }
  };

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast('已複製');
    } catch {
      toast('無法自動複製，請手動輸入', 'err');
    }
  };

  const removeChannel = async (c: Channel) => {
    if (!window.confirm(`移除「${c.displayName ?? c.target}」？之後不會再收到通知。`)) return;
    try {
      await api(`/api/channels/${c.id}`, { method: 'DELETE' });
      await mutateCh();
    } catch (e) {
      toast(errText(e), 'err');
    }
  };

  const toggleChannel = async (c: Channel, enabled: boolean) => {
    try {
      await api(`/api/channels/${c.id}`, { method: 'PATCH', body: { enabled } });
      await mutateCh();
    } catch (e) {
      toast(errText(e), 'err');
    }
  };

  const sendTest = async () => {
    setTesting(true);
    try {
      const r = await api<{ channels: ChannelResult[] }>('/api/channels/test');
      const ok = r.channels.filter((c) => c.ok).length;
      if (ok) toast(`已送出測試通知（${ok}/${r.channels.length} 成功）`);
      else toast(`傳送失敗：${r.channels[0]?.error ?? '未知錯誤'}`, 'err');
    } catch (e) {
      toast(errText(e), 'err');
    } finally {
      setTesting(false);
    }
  };

  const checkAll = async () => {
    setCheckingAll(true);
    try {
      const r = await api<{ outcomes: unknown[] }>('/api/watches/check-all');
      toast(`已檢查 ${r.outcomes.length} 筆追蹤`);
    } catch (e) {
      toast(errText(e), 'err');
    } finally {
      setCheckingAll(false);
    }
  };

  const setupTelegramWebhook = async () => {
    setSettingWebhook(true);
    try {
      const r = await api<{ url: string; lastError: string | null }>('/api/telegram/setup');
      toast(r.lastError ? `已設定，但 Telegram 回報：${r.lastError}` : `Telegram webhook 已指向 ${r.url}`, r.lastError ? 'err' : 'ok');
    } catch (e) {
      toast(errText(e), 'err');
    } finally {
      setSettingWebhook(false);
    }
  };

  const hasChannel = channels.some((c) => c.enabled);
  const serverless = status?.serverless ?? false;

  return (
    <main>
      <PageHeader title="設定" subtitle="通知管道、資料來源與排程" />
      <div className="space-y-4 px-4 py-4 lg:grid lg:grid-cols-2 lg:items-start lg:gap-6 lg:space-y-0 lg:px-8">
        <section>
          <h2 className="mb-2 px-1 text-xs font-semibold text-gray-500">通知管道</h2>
          <div className="space-y-3">
            <ChannelCard
              type="line"
              configured={status?.line.configured ?? false}
              channels={channels.filter((c) => c.type === 'line')}
              link={link?.type === 'line' ? link : null}
              onLink={() => startLink('line')}
              onCancel={() => setLink(null)}
              onCopy={copy}
              onRemove={removeChannel}
              onToggle={toggleChannel}
              setupHint={`設定 LINE_CHANNEL_ACCESS_TOKEN、LINE_CHANNEL_SECRET 與 LINE_BOT_BASIC_ID，並把 Webhook URL 指向 ${status?.appUrl ?? ''}/api/line/webhook（詳見 README）。`}
            />
            <ChannelCard
              type="telegram"
              configured={status?.telegram.configured ?? false}
              channels={channels.filter((c) => c.type === 'telegram')}
              link={link?.type === 'telegram' ? link : null}
              onLink={() => startLink('telegram')}
              onCancel={() => setLink(null)}
              onCopy={copy}
              onRemove={removeChannel}
              onToggle={toggleChannel}
              setupHint="向 @BotFather 建立機器人後，設定 TELEGRAM_BOT_TOKEN 與 TELEGRAM_BOT_USERNAME。"
              extra={
                status?.telegram.configured && !status.telegram.polling ? (
                  <div className="border-t border-gray-100 px-4 py-3">
                    <PrimaryButton variant="secondary" onClick={setupTelegramWebhook} loading={settingWebhook}>
                      設定 Telegram Webhook 指向本站
                    </PrimaryButton>
                    <p className="mt-2 text-[11px] leading-relaxed text-gray-400">此環境無法常駐輪詢，部署後請按一次讓 Telegram 把訊息送到本站。</p>
                  </div>
                ) : null
              }
            />
            <PrimaryButton variant="secondary" onClick={sendTest} loading={testing} disabled={!hasChannel}>
              🔔 傳送測試通知
            </PrimaryButton>
          </div>
        </section>

        <section>
          <h2 className="mb-2 px-1 text-xs font-semibold text-gray-500">資料來源與資料庫</h2>
          <Card className="divide-y divide-gray-100">
            <Row label="機票" value={providerText(status?.providers.flight, status?.providers.amadeusEnv)} />
            <Row label="機票盯價雷達" value={providerText(status?.providers.radar, status?.providers.amadeusEnv)} />
            <Row label="住宿" value={providerText(status?.providers.hotel, status?.providers.amadeusEnv)} />
            {status && status.providers.radar === 'travelpayouts' && status.providers.flight === 'serpapi' && (
              <p className="px-4 py-3 text-xs leading-relaxed text-gray-500">
                追蹤時先用免費的 Aviasales 快取價格盯價，看起來低於目標才花一次 SerpApi 向 Google 確認，確認是真的才通知。搜尋頁與價格確認用
                SerpApi，價格日曆用 Travelpayouts。
              </p>
            )}
            {status && status.providers.radar !== 'travelpayouts' && status.providers.flight === 'serpapi' && (
              <p className="px-4 py-3 text-xs leading-relaxed text-gray-500">
                想免費高頻盯價：到 <span className="font-medium text-gray-700">travelpayouts.com</span> 註冊，在個人資料頁複製 API token，設定
                TRAVELPAYOUTS_TOKEN 後 Redeploy。之後追蹤會先用它盯價，只在發現低價時才用 SerpApi 確認。
              </p>
            )}
            <Row
              label="資料庫"
              value={status ? (status.db.backend === 'turso' ? 'Turso 雲端資料庫' : status.db.persistent ? 'SQLite（本機檔案）' : 'SQLite 暫存檔') : '—'}
            />
            {status?.db.error && <p className="px-4 py-3 text-xs leading-relaxed text-red-600">資料庫連線失敗：{status.db.error}</p>}
            {status && !status.db.persistent && !status.db.error && (
              <p className="px-4 py-3 text-xs leading-relaxed text-amber-700">
                ⚠️ 目前使用暫存資料庫，重新部署或閒置後追蹤資料會消失。請到 turso.tech 免費建立資料庫，並在部署平台設定 TURSO_DATABASE_URL 與
                TURSO_AUTH_TOKEN（README 有步驟）。
              </p>
            )}
            {status && status.providers.flight === 'demo' && (
              <p className="px-4 py-3 text-xs leading-relaxed text-gray-500">
                目前為示範資料：價格依路線、日期、連假與航空公司推算並每 5 分鐘隨機波動，方便體驗追蹤與通知流程。到{' '}
                <span className="font-medium text-gray-700">serpapi.com</span> 註冊取得 API Key，在 Vercel 設定 SERPAPI_KEY 並 Redeploy，即可改用 Google
                即時價格。
              </p>
            )}
            {status && (status.providers.flight === 'serpapi' || status.providers.hotel === 'serpapi') && (
              <p className="px-4 py-3 text-xs leading-relaxed text-gray-500">
                SerpApi 免費方案每月約 250 次搜尋，每次搜尋、住宿追蹤檢查和價格確認都算一次；相同條件 1 小時內重複查詢不扣額度。
                {status.providers.radar === 'travelpayouts' ? '機票追蹤由雷達負責，不耗額度。' : '沒有雷達時，機票追蹤頻率建議設 12 小時或每天。'}
              </p>
            )}
          </Card>
        </section>

        <section>
          <h2 className="mb-2 px-1 text-xs font-semibold text-gray-500">自動檢查排程</h2>
          <Card className="divide-y divide-gray-100">
            <Row
              label="狀態"
              value={
                status
                  ? serverless
                    ? '無伺服器環境：由外部排程觸發'
                    : status.scheduler.enabled
                      ? status.scheduler.started
                        ? `運作中，每 ${status.scheduler.tickSeconds} 秒掃描一次`
                        : '已啟用（伺服器啟動後開始）'
                      : '已停用（SCHEDULER_ENABLED=false）'
                  : '—'
              }
            />
            {!serverless && (
              <Row label="上次掃描" value={status?.scheduler.lastTickAt ? `${relTime(status.scheduler.lastTickAt)} · ${status.scheduler.lastRunSummary ?? ''}` : '尚未'} />
            )}
            <div className="px-4 py-3">
              <PrimaryButton variant="secondary" onClick={checkAll} loading={checkingAll}>
                立即檢查所有追蹤
              </PrimaryButton>
              <p className="mt-2 text-[11px] leading-relaxed text-gray-400">
                {serverless
                  ? `Vercel Cron 每天 09:00 會檢查一次；想要更即時，請到 cron-job.org 等免費排程服務，每 5–60 分鐘呼叫 ${status?.appUrl ?? ''}/api/cron/check?key=CRON_SECRET。`
                  : '部署在無法常駐的平台時，可改用外部排程呼叫 GET /api/cron/check?key=CRON_SECRET。'}
              </p>
            </div>
          </Card>
        </section>

        <section>
          <h2 className="mb-2 px-1 text-xs font-semibold text-gray-500">關於</h2>
          <Card className="divide-y divide-gray-100">
            <Row label="App 網址" value={status?.appUrl ?? '—'} />
            <Row label="密碼保護" value={status ? (status.passwordProtected ? '已開啟，登入後記住這台裝置一年' : '未設定，公開部署前建議設定 APP_PASSWORD') : '—'} />
            {status?.passwordProtected && (
              <div className="px-4 py-3">
                <PrimaryButton
                  variant="danger"
                  onClick={async () => {
                    if (!window.confirm('登出這台裝置？下次開啟需要重新輸入密碼。')) return;
                    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => undefined);
                    window.location.href = '/login';
                  }}
                >
                  登出這台裝置
                </PrimaryButton>
              </div>
            )}
            <p className="px-4 py-3 text-xs leading-relaxed text-gray-500">
              旅行預訂神器 · 價格僅供參考，實際票價與房價以各訂購網站為準。可將此頁「加入主畫面」當作 App 使用。
            </p>
          </Card>
        </section>
      </div>
    </main>
  );
}

function providerText(p?: ProviderName, env?: 'test' | 'production' | null): string {
  if (!p) return '—';
  if (p === 'demo') return '示範資料（模擬）';
  if (p === 'serpapi') return 'Google 即時價格（SerpApi）';
  if (p === 'travelpayouts') return 'Aviasales 快取價格（Travelpayouts）';
  return env === 'production' ? 'Amadeus 正式環境' : 'Amadeus 測試環境';
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 px-4 py-3 text-sm">
      <span className="shrink-0 text-gray-500">{label}</span>
      <span className="break-all text-right font-medium">{value}</span>
    </div>
  );
}

function ChannelCard({
  type,
  configured,
  channels,
  link,
  onLink,
  onCancel,
  onCopy,
  onRemove,
  onToggle,
  setupHint,
  extra,
}: {
  type: ChannelType;
  configured: boolean;
  channels: Channel[];
  link: LinkInfo | null;
  onLink: () => void;
  onCancel: () => void;
  onCopy: (text: string) => void;
  onRemove: (c: Channel) => void;
  onToggle: (c: Channel, enabled: boolean) => void;
  setupHint: string;
  extra?: React.ReactNode;
}) {
  const isLine = type === 'line';
  const name = isLine ? 'LINE' : 'Telegram';
  const pill = !configured
    ? { text: '未設定', cls: 'bg-gray-100 text-gray-500' }
    : channels.length
      ? { text: `已連結 ${channels.length}`, cls: 'bg-emerald-50 text-emerald-700' }
      : { text: '未連結', cls: 'bg-amber-50 text-amber-700' };

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3">
        <span className={`flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold text-white ${isLine ? 'bg-line' : 'bg-telegram'}`}>
          {isLine ? 'LINE' : '✈'}
        </span>
        <div className="flex-1">
          <div className="font-semibold">{name}</div>
          <div className="text-xs text-gray-500">{isLine ? '官方帳號推播（Flex 卡片）' : '機器人私訊通知'}</div>
        </div>
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${pill.cls}`}>{pill.text}</span>
      </div>

      {!configured ? (
        <p className="border-t border-gray-100 px-4 py-3 text-xs leading-relaxed text-gray-500">{setupHint}</p>
      ) : (
        <>
          {channels.map((c) => (
            <div key={c.id} className="flex items-center border-t border-gray-100">
              <div className="flex-1">
                <Toggle checked={c.enabled} onChange={(v) => onToggle(c, v)} label={c.displayName ?? c.target} hint={c.displayName ? c.target : undefined} />
              </div>
              <button type="button" onClick={() => onRemove(c)} className="mr-3 h-9 rounded-lg px-3 text-xs font-medium text-red-600 tap">
                移除
              </button>
            </div>
          ))}
          <div className="border-t border-gray-100 px-4 py-3">
            {link ? (
              <div>
                <div className="text-xs text-gray-500">連結碼（10 分鐘內有效）</div>
                <button type="button" onClick={() => onCopy(link.code)} className="mt-1 w-full rounded-xl bg-gray-900 py-3 text-center font-mono text-3xl font-bold tracking-[0.3em] text-white tap">
                  {link.code}
                </button>
                <ol className="mt-3 space-y-2 text-sm">
                  {isLine ? (
                    <>
                      <li className="flex gap-2">
                        <span className="font-semibold text-brand-600">1.</span>
                        <span className="flex-1">
                          加入官方帳號好友
                          {link.addFriendUrl ? (
                            <a href={link.addFriendUrl} target="_blank" rel="noopener noreferrer" className="ml-2 inline-flex h-8 items-center rounded-lg bg-line px-3 text-xs font-semibold text-white tap">
                              加入好友
                            </a>
                          ) : (
                            <span className="ml-1 text-xs text-gray-500">（設定 LINE_BOT_BASIC_ID 可顯示加好友按鈕）</span>
                          )}
                        </span>
                      </li>
                      <li className="flex gap-2">
                        <span className="font-semibold text-brand-600">2.</span>
                        <span className="flex-1">
                          在聊天室傳送連結碼 <span className="font-mono font-semibold">{link.code}</span> 給官方帳號
                        </span>
                      </li>
                    </>
                  ) : (
                    <>
                      <li className="flex gap-2">
                        <span className="font-semibold text-brand-600">1.</span>
                        <span className="flex-1">
                          {link.telegramUrl ? (
                            <a href={link.telegramUrl} target="_blank" rel="noopener noreferrer" className="inline-flex h-9 items-center rounded-lg bg-telegram px-3 text-sm font-semibold text-white tap">
                              開啟 Telegram 自動連結
                            </a>
                          ) : (
                            '開啟與機器人的對話（設定 TELEGRAM_BOT_USERNAME 可顯示一鍵連結）'
                          )}
                        </span>
                      </li>
                      <li className="flex gap-2">
                        <span className="font-semibold text-brand-600">2.</span>
                        <span className="flex-1">
                          或手動傳送 <span className="font-mono font-semibold">/start {link.code}</span>
                        </span>
                      </li>
                    </>
                  )}
                </ol>
                <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                  <span className="inline-flex items-center gap-1">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
                    等待連結中…
                  </span>
                  <button type="button" onClick={onCancel} className="rounded-lg px-2 py-1 text-gray-500 tap">
                    取消
                  </button>
                </div>
              </div>
            ) : (
              <PrimaryButton variant={isLine ? 'line' : 'telegram'} onClick={onLink}>
                {channels.length ? `再連結一個 ${name}` : `連結 ${name}`}
              </PrimaryButton>
            )}
          </div>
          {extra}
        </>
      )}
    </Card>
  );
}
