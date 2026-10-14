'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { api, errText } from '@/lib/client';
import { fmtPrice } from '@/lib/format';
import type { FlightSearchParams, HotelSearchParams, Watch, WatchType } from '@/lib/types';
import { Sheet } from './Sheet';
import { toast } from './Toast';
import { Chip, PrimaryButton, Toggle } from './ui';

const INTERVALS: [number, string][] = [
  [30, '30 分鐘'],
  [60, '1 小時'],
  [180, '3 小時'],
  [360, '6 小時'],
  [720, '12 小時'],
  [1440, '每天'],
];

interface Props {
  open: boolean;
  onClose: () => void;
  type: WatchType;
  params: FlightSearchParams | HotelSearchParams;
  currentPrice: number | null;
  currency?: string;
  defaultTitle: string;
  subtitle: string;
}

export function CreateWatchSheet({ open, onClose, type, params, currentPrice, currency = 'TWD', defaultTitle, subtitle }: Props) {
  const router = useRouter();
  const [title, setTitle] = useState(defaultTitle);
  const [target, setTarget] = useState('');
  const [notifyOnDrop, setNotifyOnDrop] = useState(true);
  const [dropPercent, setDropPercent] = useState(5);
  const [intervalMin, setIntervalMin] = useState(60);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle(defaultTitle);
    setTarget(currentPrice ? String(Math.floor((currentPrice * 0.92) / 100) * 100) : '');
    setSaving(false);
  }, [open, defaultTitle, currentPrice]);

  const quick = (pct: number) => {
    if (!currentPrice) return;
    setTarget(String(Math.floor((currentPrice * (1 - pct / 100)) / 100) * 100));
  };

  const submit = async () => {
    const targetPrice = target.trim() ? Number(target) : null;
    if (targetPrice != null && (!Number.isInteger(targetPrice) || targetPrice <= 0)) {
      toast('目標價請輸入正整數', 'err');
      return;
    }
    setSaving(true);
    try {
      await api<{ watch: Watch }>('/api/watches', {
        body: { type, title: title.trim() || defaultTitle, params, targetPrice, notifyOnDrop, dropPercent, intervalMin },
      });
      toast('已加入追蹤，將持續為你盯價 🔔');
      onClose();
      router.push('/watches');
    } catch (e) {
      toast(errText(e), 'err');
      setSaving(false);
    }
  };

  const targetNum = Number(target);
  const diff = currentPrice && targetNum > 0 ? Math.round(((currentPrice - targetNum) / currentPrice) * 100) : null;

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="追蹤最低價"
      footer={
        <PrimaryButton onClick={submit} loading={saving}>
          開始追蹤
        </PrimaryButton>
      }
    >
      <div className="rounded-2xl bg-gray-50 p-3">
        <div className="text-sm font-semibold">{defaultTitle}</div>
        <div className="mt-0.5 text-xs text-gray-500">{subtitle}</div>
        {currentPrice != null && (
          <div className="mt-2 text-xs text-gray-500">
            目前最低 <span className="text-base font-bold text-gray-900">{fmtPrice(currentPrice, currency)}</span>
          </div>
        )}
      </div>

      <label className="mt-4 block">
        <span className="text-sm font-medium">目標價（含稅總價）</span>
        <div className="mt-1.5 flex h-12 items-center rounded-xl border border-gray-200 bg-white px-3 focus-within:border-brand-500">
          <span className="mr-2 text-sm text-gray-500">{currency === 'TWD' ? 'NT$' : currency}</span>
          <input
            type="number"
            inputMode="numeric"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            placeholder="不設定則只在降價時通知"
            className="h-full flex-1 bg-transparent text-base font-semibold outline-none"
          />
        </div>
        {diff != null && target && (
          <div className="mt-1 text-xs text-gray-500">{diff > 0 ? `比目前低 ${diff}%，達到就通知你` : diff === 0 ? '等於目前價格，建立後會立即通知' : `高於目前價格，建立後會立即通知`}</div>
        )}
      </label>
      {currentPrice != null && (
        <div className="mt-2 flex gap-2 overflow-x-auto no-scrollbar">
          {[5, 10, 15, 20].map((p) => (
            <Chip key={p} onClick={() => quick(p)} active={targetNum === Math.floor((currentPrice * (1 - p / 100)) / 100) * 100}>
              −{p}%
            </Chip>
          ))}
          <Chip onClick={() => setTarget('')} active={!target}>
            不設定
          </Chip>
        </div>
      )}

      <div className="mt-4 overflow-hidden rounded-2xl border border-gray-200">
        <Toggle checked={notifyOnDrop} onChange={setNotifyOnDrop} label="降價時也通知" hint="與上次檢查相比下跌達以下幅度" />
        {notifyOnDrop && (
          <div className="flex gap-2 border-t border-gray-100 px-4 py-3">
            {[3, 5, 10, 15].map((p) => (
              <Chip key={p} active={dropPercent === p} onClick={() => setDropPercent(p)}>
                {p}%
              </Chip>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4">
        <div className="text-sm font-medium">檢查頻率</div>
        <div className="mt-2 flex flex-wrap gap-2">
          {INTERVALS.map(([min, label]) => (
            <Chip key={min} active={intervalMin === min} onClick={() => setIntervalMin(min)}>
              {label}
            </Chip>
          ))}
        </div>
        <p className="mt-1.5 text-[11px] text-gray-400">使用真實 API 時，頻率越高消耗的查詢額度越多，建議 3 小時以上。</p>
      </div>

      <label className="mt-4 block">
        <span className="text-sm font-medium">名稱</span>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={80}
          className="mt-1.5 h-12 w-full rounded-xl border border-gray-200 bg-white px-3 text-base outline-none focus:border-brand-500"
        />
      </label>
      <div className="h-2" />
    </Sheet>
  );
}
