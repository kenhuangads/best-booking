'use client';

import { useEffect, useMemo, useState } from 'react';
import { addMonths, diffDays, fmtDate, parseISO, todayISO, toISO, WEEKDAYS } from '@/lib/format';
import { getHoliday, inLongWeekend, upcomingLongWeekends } from '@/lib/holidays';
import { Sheet } from './Sheet';
import { PrimaryButton } from './ui';

interface Props {
  open: boolean;
  onClose: () => void;
  mode: 'single' | 'range';
  start: string | null;
  end: string | null;
  onConfirm: (r: { start: string; end: string | null }) => void;
  title?: string;
  startLabel?: string;
  endLabel?: string;
  minDate?: string;
  /** 最遠可選到今天起幾個月後 */
  maxMonths?: number;
  /** 出發日距今超過這個天數時在下方提醒（機票用：航空公司可能還沒開賣） */
  farNote?: { afterDays: number; text: string };
  unit?: '天' | '晚';
}

/** 兩個日期之間跨幾個月（含頭尾） */
function monthSpan(a: string, b: string): number {
  const [ay, am] = a.split('-').map(Number);
  const [by, bm] = b.split('-').map(Number);
  return (by - ay) * 12 + (bm - am) + 1;
}

interface Month {
  key: string;
  label: string;
  cells: (string | null)[];
}

function buildMonths(minISO: string, n: number): Month[] {
  const base = parseISO(minISO);
  const months: Month[] = [];
  for (let i = 0; i < n; i++) {
    const d = new Date(base.getFullYear(), base.getMonth() + i, 1);
    const y = d.getFullYear();
    const m = d.getMonth();
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const cells: (string | null)[] = Array.from({ length: d.getDay() }, () => null);
    for (let day = 1; day <= daysInMonth; day++) cells.push(toISO(new Date(y, m, day)));
    months.push({ key: `${y}-${String(m + 1).padStart(2, '0')}`, label: `${y}年${m + 1}月`, cells });
  }
  return months;
}

const fmtShort = (iso: string) => `${Number(iso.slice(5, 7))}/${Number(iso.slice(8, 10))}`;

/** 行動版日曆：垂直捲動多月、標示台灣國定假日與連假、支援單日 / 區間 */
export function DatePicker({
  open,
  onClose,
  mode,
  start,
  end,
  onConfirm,
  title,
  startLabel = '出發',
  endLabel = '回程',
  minDate,
  maxMonths = 18,
  farNote,
  unit = '天',
}: Props) {
  const [s, setS] = useState<string | null>(start);
  const [e, setE] = useState<string | null>(end);
  const [phase, setPhase] = useState<'start' | 'end'>('start');

  useEffect(() => {
    if (open) {
      setS(start);
      setE(end);
      setPhase('start');
    }
  }, [open, start, end]);

  const today = todayISO();
  const min = minDate ?? today;
  const max = useMemo(() => addMonths(today, maxMonths), [today, maxMonths]);
  const months = useMemo(() => buildMonths(min, monthSpan(min, max)), [min, max]);
  const quick = useMemo(() => upcomingLongWeekends(min, 12).filter((lw) => lw.start <= max), [min, max]);
  const showFarNote = !!farNote && !!s && diffDays(today, s) > farNote.afterDays;

  const pick = (d: string) => {
    if (mode === 'single') {
      setS(d);
      setE(null);
      return;
    }
    if (phase === 'start' || !s || d <= s) {
      setS(d);
      setE(null);
      setPhase('end');
    } else {
      setE(d);
      setPhase('start');
    }
  };

  const valid = mode === 'single' ? !!s : !!s && !!e;
  const nights = s && e ? diffDays(s, e) : 0;
  const summary =
    mode === 'single'
      ? s
        ? `${startLabel} ${fmtDate(s)}`
        : `請選擇${startLabel}日期`
      : s && e
        ? `${fmtDate(s)} → ${fmtDate(e)} · ${nights} ${unit}`
        : s
          ? `${startLabel} ${fmtDate(s)}，請選擇${endLabel}`
          : `請選擇${startLabel}日期`;

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={title ?? (mode === 'range' ? `選擇${startLabel}與${endLabel}日期` : `選擇${startLabel}日期`)}
      full
      wide
      footer={
        <div className="lg:flex lg:items-center lg:justify-between lg:gap-4">
          <div className="mb-2 text-center lg:mb-0 lg:text-left">
            <div className="text-sm text-gray-600">{summary}</div>
            {showFarNote && <div className="mt-0.5 text-xs text-amber-700">{farNote?.text}</div>}
          </div>
          <PrimaryButton
            className="lg:w-48"
            disabled={!valid}
            onClick={() => {
              if (valid && s) {
                onConfirm({ start: s, end: mode === 'range' ? e : null });
                onClose();
              }
            }}
          >
            確定
          </PrimaryButton>
        </div>
      }
    >
      {quick.length > 0 && (
        <div className="-mx-4 mb-1 flex gap-2 overflow-x-auto px-4 pb-2 no-scrollbar">
          {quick.map((lw) => (
            <button
              key={lw.start}
              type="button"
              onClick={() => {
                setS(lw.start);
                setE(mode === 'range' ? lw.end : null);
                setPhase('start');
              }}
              className="shrink-0 rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 tap lg:hover:bg-rose-100"
            >
              🎌 {lw.name} {fmtShort(lw.start)}–{fmtShort(lw.end)}
              {lw.estimated ? '*' : ''}
            </button>
          ))}
        </div>
      )}
      <div className="sticky top-0 z-10 -mx-4 grid grid-cols-7 bg-white px-4 py-1.5 text-center text-xs text-gray-500 lg:hidden">
        <WeekdayRow />
      </div>
      {/* 電腦版兩個月並排 */}
      <div className="lg:grid lg:grid-cols-2 lg:gap-x-10">
        {months.map((m) => (
          <div key={m.key} className="mb-2 lg:mb-4">
            <div className="py-2 text-sm font-semibold">{m.label}</div>
            <div className="mb-1 hidden grid-cols-7 text-center text-xs text-gray-500 lg:grid">
              <WeekdayRow />
            </div>
            <div className="grid grid-cols-7 gap-y-1">
              {m.cells.map((d, i) => (d ? <DayCell key={d} d={d} min={min} max={max} today={today} s={s} e={e} onPick={pick} /> : <div key={`e${i}`} />))}
            </div>
          </div>
        ))}
      </div>
      <p className="pb-2 pt-1 text-center text-[11px] leading-relaxed text-gray-400">
        紅字為例假日，淡紅底為連續假期
        <br />* 為依法規推算之預估日期，以人事行政總處公告為準
      </p>
    </Sheet>
  );
}

function WeekdayRow() {
  return (
    <>
      {WEEKDAYS.map((w, i) => (
        <div key={w} className={i === 0 ? 'text-red-500' : ''}>
          {w}
        </div>
      ))}
    </>
  );
}

function DayCell({
  d,
  min,
  max,
  today,
  s,
  e,
  onPick,
}: {
  d: string;
  min: string;
  max: string;
  today: string;
  s: string | null;
  e: string | null;
  onPick: (d: string) => void;
}) {
  const disabled = d < min || d > max;
  const hol = getHoliday(d);
  const lw = inLongWeekend(d);
  const isStart = d === s;
  const isEnd = d === e;
  const inRange = !!s && !!e && d > s && d < e;
  const dow = parseISO(d).getDay();
  const red = !disabled && !isStart && !isEnd && (dow === 0 || !!hol);

  let cls = 'relative flex h-12 flex-col items-center justify-center rounded-lg text-sm tap lg:h-11';
  if (!disabled && !(d === s) && !(d === e)) cls += ' lg:hover:ring-2 lg:hover:ring-brand-200';
  if (disabled) cls += ' text-gray-300';
  else if (isStart || isEnd) cls += ' bg-brand-600 font-semibold text-white';
  else if (inRange) cls += ' bg-brand-50 text-brand-700';
  else if (lw) cls += ' bg-rose-50';
  if (red) cls += ' text-red-500';

  return (
    <button type="button" disabled={disabled} onClick={() => onPick(d)} className={cls} aria-label={`${d}${hol ? ` ${hol.name}` : ''}`}>
      <span className="leading-none">{Number(d.slice(8, 10))}</span>
      {hol ? (
        <span className={`mt-1 max-w-full truncate px-0.5 text-[9px] leading-none ${isStart || isEnd ? 'text-white/90' : ''}`}>{hol.short}</span>
      ) : d === today ? (
        <span className={`mt-1 text-[9px] leading-none ${isStart || isEnd ? 'text-white/90' : 'text-brand-600'}`}>今天</span>
      ) : null}
    </button>
  );
}
