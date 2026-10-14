'use client';

import { useEffect, useMemo, useState } from 'react';
import { AIRLINES, routeAirlineCodes } from '@/lib/airlines';
import { Sheet } from './Sheet';
import { PrimaryButton } from './ui';

interface Props {
  open: boolean;
  onClose: () => void;
  from: string;
  to: string;
  value: string[];
  onChange: (codes: string[]) => void;
}

/** 指定航空公司（可複選）：先列這條航線常見的航空公司，其他放後面 */
export function AirlinePicker({ open, onClose, from, to, value, onChange }: Props) {
  const [sel, setSel] = useState<string[]>(value);
  const [q, setQ] = useState('');
  useEffect(() => {
    if (open) {
      setSel(value);
      setQ('');
    }
  }, [open, value]);

  const common = useMemo(() => routeAirlineCodes(from, to), [from, to]);
  const s = q.trim().toLowerCase();
  const match = (c: string) => !s || c.toLowerCase().includes(s) || AIRLINES[c].name.toLowerCase().includes(s);
  const commonList = common.filter(match);
  const otherList = Object.keys(AIRLINES).filter((c) => !common.includes(c) && match(c));
  const toggle = (c: string) => setSel((x) => (x.includes(c) ? x.filter((y) => y !== c) : [...x, c]));

  const row = (c: string) => {
    const on = sel.includes(c);
    const a = AIRLINES[c];
    return (
      <li key={c}>
        <button
          type="button"
          onClick={() => toggle(c)}
          aria-pressed={on}
          className="flex min-h-[56px] w-full items-center gap-3 border-b border-gray-100 py-2 text-left tap"
        >
          <span className="inline-flex h-6 min-w-[36px] items-center justify-center rounded bg-gray-900 px-1 font-mono text-[11px] font-bold text-white">{c}</span>
          <span className="flex-1 font-medium">
            {a.name}
            {a.tier === 'lcc' && <span className="ml-2 rounded bg-orange-50 px-1.5 py-0.5 text-[11px] font-medium text-orange-700">廉航</span>}
          </span>
          <span
            aria-hidden
            className={`flex h-6 w-6 items-center justify-center rounded-md border-2 text-sm font-bold ${
              on ? 'border-brand-600 bg-brand-600 text-white' : 'border-gray-300 text-transparent'
            }`}
          >
            ✓
          </span>
        </button>
      </li>
    );
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="指定航空公司"
      full
      footer={
        <div className="flex gap-2">
          <PrimaryButton
            variant="secondary"
            className="flex-1"
            onClick={() => {
              onChange([]);
              onClose();
            }}
          >
            不限
          </PrimaryButton>
          <PrimaryButton
            className="flex-[2]"
            onClick={() => {
              onChange(sel);
              onClose();
            }}
          >
            {sel.length ? `確定，已選 ${sel.length} 家` : '確定'}
          </PrimaryButton>
        </div>
      }
    >
      <div className="sticky top-0 z-10 -mx-4 bg-white px-4 pb-2 pt-1">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="搜尋航空公司，例：星宇、BR"
          inputMode="search"
          className="h-12 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 text-base outline-none focus:border-brand-500 focus:bg-white"
        />
      </div>
      {commonList.length > 0 && (
        <section className="mb-3">
          <h3 className="py-2 text-xs font-semibold text-gray-500">這條航線常見</h3>
          <ul>{commonList.map(row)}</ul>
        </section>
      )}
      {otherList.length > 0 && (
        <section className="mb-3">
          <h3 className="py-2 text-xs font-semibold text-gray-500">其他航空公司</h3>
          <ul>{otherList.map(row)}</ul>
        </section>
      )}
      {!commonList.length && !otherList.length && <p className="py-10 text-center text-sm text-gray-500">找不到「{q}」</p>}
    </Sheet>
  );
}
