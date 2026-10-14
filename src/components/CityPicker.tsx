'use client';

import { useEffect, useState } from 'react';
import { REGION_ORDER } from '@/lib/airports';
import { CITIES, getCity, POPULAR_CITIES, searchCities, type City } from '@/lib/cities';
import { Sheet } from './Sheet';

interface Props {
  open: boolean;
  onClose: () => void;
  onSelect: (key: string) => void;
  title?: string;
}

export function CityPicker({ open, onClose, onSelect, title = '選擇目的地' }: Props) {
  const [q, setQ] = useState('');
  useEffect(() => {
    if (open) setQ('');
  }, [open]);
  const results = q.trim() ? searchCities(q) : null;
  const pick = (key: string) => {
    onSelect(key);
    onClose();
  };

  return (
    <Sheet open={open} onClose={onClose} title={title} full>
      <div className="sticky top-0 z-10 -mx-4 bg-white px-4 pb-2 pt-1">
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="城市或地區，例：東京、礁溪、墾丁"
          inputMode="search"
          className="h-12 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 text-base outline-none focus:border-brand-500 focus:bg-white"
        />
      </div>
      {results ? (
        results.length ? (
          <CityList items={results} onPick={pick} />
        ) : (
          <p className="py-10 text-center text-sm text-gray-500">找不到「{q}」</p>
        )
      ) : (
        <>
          <section className="mb-3">
            <h3 className="py-2 text-xs font-semibold text-gray-500">熱門</h3>
            <div className="flex flex-wrap gap-2">
              {POPULAR_CITIES.map((key) => {
                const c = getCity(key);
                if (!c) return null;
                return (
                  <button key={key} type="button" onClick={() => pick(key)} className="rounded-full border border-gray-200 bg-white px-3 py-2 text-sm font-medium tap">
                    {c.name}
                  </button>
                );
              })}
            </div>
          </section>
          {REGION_ORDER.map((region) => {
            const items = CITIES.filter((c) => c.region === region);
            if (!items.length) return null;
            return (
              <section key={region} className="mb-3">
                <h3 className="py-2 text-xs font-semibold text-gray-500">{region}</h3>
                <CityList items={items} onPick={pick} />
              </section>
            );
          })}
        </>
      )}
    </Sheet>
  );
}

function CityList({ items, onPick }: { items: City[]; onPick: (key: string) => void }) {
  return (
    <ul>
      {items.map((c) => (
        <li key={c.key}>
          <button type="button" onClick={() => onPick(c.key)} className="flex min-h-[56px] w-full items-center justify-between border-b border-gray-100 py-2 text-left tap">
            <span>
              <span className="font-medium">{c.name}</span>
              <span className="ml-2 text-xs text-gray-400">{c.country}</span>
              <span className="block truncate text-xs text-gray-500">{c.areas.slice(0, 4).join('、')}</span>
            </span>
            <span className="text-gray-300">›</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
