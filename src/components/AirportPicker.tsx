'use client';

import { useEffect, useState } from 'react';
import { AIRPORTS, getAirport, POPULAR_TO, REGION_ORDER, searchAirports, type Airport } from '@/lib/airports';
import { Sheet } from './Sheet';

interface Props {
  open: boolean;
  onClose: () => void;
  onSelect: (code: string) => void;
  title: string;
  popular?: string[];
}

export function AirportPicker({ open, onClose, onSelect, title, popular = POPULAR_TO }: Props) {
  const [q, setQ] = useState('');
  useEffect(() => {
    if (open) setQ('');
  }, [open]);
  const results = q.trim() ? searchAirports(q) : null;
  const pick = (code: string) => {
    onSelect(code);
    onClose();
  };

  return (
    <Sheet open={open} onClose={onClose} title={title} full>
      <div className="sticky top-0 z-10 -mx-4 bg-white px-4 pb-2 pt-1">
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="城市、機場或代碼，例：東京、NRT"
          inputMode="search"
          className="h-12 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 text-base outline-none focus:border-brand-500 focus:bg-white"
        />
      </div>
      {results ? (
        results.length ? (
          <AirportList items={results} onPick={pick} />
        ) : (
          <p className="py-10 text-center text-sm text-gray-500">找不到「{q}」，試試城市名稱或 IATA 代碼</p>
        )
      ) : (
        <>
          <Section title="熱門">
            <div className="flex flex-wrap gap-2">
              {popular.map((code) => {
                const a = getAirport(code);
                if (!a) return null;
                return (
                  <button
                    key={code}
                    type="button"
                    onClick={() => pick(code)}
                    className="rounded-full border border-gray-200 bg-white px-3 py-2 text-sm font-medium tap"
                  >
                    {a.city} <span className="text-gray-400">{code}</span>
                  </button>
                );
              })}
            </div>
          </Section>
          {REGION_ORDER.map((region) => (
            <Section key={region} title={region}>
              <AirportList items={AIRPORTS.filter((a) => a.region === region)} onPick={pick} />
            </Section>
          ))}
        </>
      )}
    </Sheet>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-3">
      <h3 className="py-2 text-xs font-semibold text-gray-500">{title}</h3>
      {children}
    </section>
  );
}

function AirportList({ items, onPick }: { items: Airport[]; onPick: (code: string) => void }) {
  return (
    <ul>
      {items.map((a) => (
        <li key={a.code}>
          <button
            type="button"
            onClick={() => onPick(a.code)}
            className="flex min-h-[56px] w-full items-center justify-between border-b border-gray-100 py-2 text-left tap"
          >
            <span>
              <span className="font-medium">{a.city}</span>
              <span className="ml-2 text-sm text-gray-500">{a.name}</span>
              <span className="block text-xs text-gray-400">{a.country}</span>
            </span>
            <span className="rounded-md bg-gray-100 px-2 py-1 font-mono text-xs font-semibold text-gray-600">{a.code}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
