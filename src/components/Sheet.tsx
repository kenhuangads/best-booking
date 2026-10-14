'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  /** 固定佔滿 92% 高度（搜尋型清單用） */
  full?: boolean;
}

/** 行動裝置常見的底部彈窗（Bottom Sheet） */
export function Sheet({ open, onClose, title, children, footer, full = false }: SheetProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!mounted || !open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 animate-fade-in bg-black/40" onClick={onClose} />
      <div
        className={`absolute inset-x-0 bottom-0 mx-auto flex w-full max-w-md animate-sheet-up flex-col rounded-t-3xl bg-white shadow-2xl ${
          full ? 'h-[92dvh]' : 'max-h-[88dvh]'
        }`}
      >
        <div className="relative flex shrink-0 items-center justify-between px-4 pb-2 pt-5">
          <div className="absolute left-1/2 top-2 h-1.5 w-10 -translate-x-1/2 rounded-full bg-gray-300" />
          <h2 className="text-base font-semibold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="關閉"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-600 tap"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">{children}</div>
        {footer && <div className="shrink-0 border-t border-gray-100 bg-white px-4 py-3 safe-bottom">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
