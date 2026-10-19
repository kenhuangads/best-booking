'use client';

import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { api, errText, fetcher } from '@/lib/client';
import { diffDays, fmtDate } from '@/lib/format';
import { spacingFor } from '@/lib/quotaMath';
import type { StatusResponse, Watch } from '@/lib/types';
import { watchSubtitle } from '@/lib/watchText';
import { INTERVALS } from './CreateWatchSheet';
import { DatePicker } from './DatePicker';
import { Sheet } from './Sheet';
import { toast } from './Toast';
import { Chip, FieldButton, PrimaryButton, Toggle } from './ui';

interface Props {
  /** 要編輯 / 複製的追蹤；null 時關閉 */
  watch: Watch | null;
  mode: 'edit' | 'copy';
  onClose: () => void;
  onSaved: () => void;
}

/** 編輯追蹤，或複製成同一間飯店 / 同一條航線、不同日期的新追蹤 */
export function WatchFormSheet({ watch, mode, onClose, onSaved }: Props) {
  const [title, setTitle] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState<string | null>(null);
  const [target, setTarget] = useState('');
  const [notifyOnDrop, setNotifyOnDrop] = useState(true);
  const [dropPercent, setDropPercent] = useState(5);
  const [intervalMin, setIntervalMin] = useState(60);
  const [dateOpen, setDateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const { data: status } = useSWR<StatusResponse>(watch ? '/api/status' : null, fetcher, { revalidateOnFocus: false });

  useEffect(() => {
    if (!watch) return;
    setTitle(watch.title);
    if (watch.type === 'flight') {
      setStart(watch.params.departDate);
      setEnd(watch.params.returnDate ?? null);
    } else {
      setStart(watch.params.checkIn);
      setEnd(watch.params.checkOut);
    }
    setTarget(watch.targetPrice != null ? String(watch.targetPrice) : '');
    setNotifyOnDrop(watch.notifyOnDrop);
    setDropPercent(watch.dropPercent);
    setIntervalMin(watch.intervalMin);
    setSaving(false);
    // 複製通常就是要換日期，直接打開日曆
    setDateOpen(mode === 'copy');
  }, [watch, mode]);

  if (!watch) return null;

  const isFlight = watch.type === 'flight';
  const roundTrip = isFlight ? !!watch.params.returnDate : true;
  const origStart = isFlight ? watch.params.departDate : watch.params.checkIn;
  const origEnd = isFlight ? (watch.params.returnDate ?? null) : watch.params.checkOut;
  const datesChanged = start !== origStart || end !== origEnd;
  const checkProvider = isFlight ? status?.providers.radar : status?.providers.hotel;
  const quotaLimited = checkProvider === 'serpapi';
  const serp = status?.serp;
  const spacing = serp ? spacingFor(serp.dependentCount + (mode === 'copy' ? 1 : 0), serp.dailyCap) : null;

  const submit = async () => {
    const targetPrice = target.trim() ? Number(target) : null;
    if (targetPrice != null && (!Number.isInteger(targetPrice) || targetPrice <= 0)) {
      toast('目標價請輸入正整數', 'err');
      return;
    }
    if (!start || (roundTrip && !end)) {
      toast('請選擇日期', 'err');
      return;
    }
    const params = isFlight
      ? { ...watch.params, departDate: start, returnDate: roundTrip ? (end ?? undefined) : undefined }
      : { ...watch.params, checkIn: start, checkOut: end ?? start };
    const body = { title: title.trim() || watch.title, targetPrice, notifyOnDrop, dropPercent, intervalMin, params };
    setSaving(true);
    try {
      if (mode === 'edit') {
        await api(`/api/watches/${watch.id}`, { method: 'PATCH', body });
        toast(datesChanged ? '已改日期，並重新查價' : '已儲存');
      } else {
        await api('/api/watches', { body: { type: watch.type, ...body } });
        toast('已複製成新的追蹤 🔔');
      }
      onSaved();
      onClose();
    } catch (e) {
      toast(errText(e), 'err');
      setSaving(false);
    }
  };

  const dateLabel = isFlight ? ['出發日期', '回程日期'] : ['入住', '退房'];
  const nights = end ? diffDays(start, end) : 0;

  return (
    <Sheet
      open
      onClose={onClose}
      title={mode === 'edit' ? '編輯追蹤' : '複製追蹤：換個日期'}
      footer={
        <PrimaryButton onClick={submit} loading={saving}>
          {mode === 'edit' ? '儲存變更' : '建立新的追蹤'}
        </PrimaryButton>
      }
    >
      <div className="rounded-2xl bg-gray-50 p-3">
        <div className="text-sm font-semibold">
          {isFlight ? '✈️' : '🏨'} {watch.title}
        </div>
        <div className="mt-0.5 text-xs text-gray-500">原本：{watchSubtitle(watch)}</div>
      </div>

      <div className="mt-4">
        <div className="mb-1.5 text-sm font-medium">日期</div>
        <div className="flex overflow-hidden rounded-2xl border border-gray-200">
          <FieldButton label={dateLabel[0]} value={fmtDate(start)} onClick={() => setDateOpen(true)} className="flex-1" />
          {roundTrip && (
            <>
              {!isFlight && <div className="flex items-center px-1 text-xs text-gray-400">{nights} 晚</div>}
              <FieldButton label={dateLabel[1]} value={fmtDate(end)} onClick={() => setDateOpen(true)} className="flex-1 border-l border-gray-200" align="right" />
            </>
          )}
        </div>
        {mode === 'copy' && !datesChanged && <p className="mt-1.5 text-[11px] text-amber-700">日期和原本一樣，記得換成新日期。</p>}
        {mode === 'edit' && datesChanged && <p className="mt-1.5 text-[11px] text-gray-500">改了日期會清掉舊的價格走勢，並馬上重新查價。</p>}
      </div>

      <label className="mt-4 block">
        <span className="text-sm font-medium">目標價（含稅總價）</span>
        <div className="mt-1.5 flex h-12 items-center rounded-xl border border-gray-200 bg-white px-3 focus-within:border-brand-500">
          <span className="mr-2 text-sm text-gray-500">NT$</span>
          <input
            type="number"
            inputMode="numeric"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            placeholder="不設定則只在降價時通知"
            className="h-full flex-1 bg-transparent text-base font-semibold outline-none"
          />
        </div>
      </label>

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
        {quotaLimited ? (
          <p className="mt-1.5 rounded-xl bg-gray-50 px-3 py-2.5 text-xs leading-relaxed text-gray-600">
            依 Google 查價額度自動安排{spacing ? `，約每 ${spacing} 小時查一次` : ''}。追蹤越多，每筆間隔越長。
          </p>
        ) : (
          <div className="mt-2 flex flex-wrap gap-2">
            {INTERVALS.map(([min, label]) => (
              <Chip key={min} active={intervalMin === min} onClick={() => setIntervalMin(min)}>
                {label}
              </Chip>
            ))}
          </div>
        )}
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

      <DatePicker
        open={dateOpen}
        onClose={() => setDateOpen(false)}
        mode={roundTrip ? 'range' : 'single'}
        start={start}
        end={roundTrip ? end : null}
        startLabel={isFlight ? '出發' : '入住'}
        endLabel={isFlight ? '回程' : '退房'}
        unit={isFlight ? '天' : '晚'}
        farNote={isFlight ? { afterDays: 330, text: '出發日超過 11 個月，部分航空公司可能還沒開賣，查不到價格是正常的' } : undefined}
        onConfirm={({ start: s, end: e }) => {
          setStart(s);
          setEnd(roundTrip ? e : null);
        }}
      />
    </Sheet>
  );
}
