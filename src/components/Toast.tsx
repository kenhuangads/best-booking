'use client';

import { useEffect, useState } from 'react';

type ToastItem = { id: number; text: string; kind: 'ok' | 'err' };

export function toast(text: string, kind: 'ok' | 'err' = 'ok') {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('bb:toast', { detail: { text, kind } }));
}

export function Toaster() {
  const [items, setItems] = useState<ToastItem[]>([]);
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ text: string; kind: 'ok' | 'err' }>).detail;
      const id = Date.now() + Math.random();
      setItems((x) => [...x.slice(-2), { id, ...detail }]);
      setTimeout(() => setItems((x) => x.filter((i) => i.id !== id)), 2800);
    };
    window.addEventListener('bb:toast', handler);
    return () => window.removeEventListener('bb:toast', handler);
  }, []);
  if (!items.length) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(84px+env(safe-area-inset-bottom))] z-[70] flex flex-col items-center gap-2 px-4">
      {items.map((i) => (
        <div
          key={i.id}
          role="status"
          className={`animate-fade-in max-w-md rounded-full px-4 py-2.5 text-sm font-medium text-white shadow-lg ${
            i.kind === 'err' ? 'bg-red-600' : 'bg-gray-900/95'
          }`}
        >
          {i.text}
        </div>
      ))}
    </div>
  );
}
