'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  /** 固定高度（搜尋型清單用） */
  full?: boolean;
  /** 電腦版用較寬的對話框（例如並排兩個月的日曆） */
  wide?: boolean;
}

/** 手機是底部彈窗（Bottom Sheet），電腦版變成畫面置中的對話框 */
export function Sheet({ open, onClose, title, children, footer, full = false, wide = false }: SheetProps) {
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
          full ? 'h-[92dvh] lg:h-[85vh]' : 'max-h-[88dvh] lg:max-h-[85vh]'
        } lg:bottom-auto lg:top-1/2 lg:-translate-y-1/2 lg:rounded-3xl ${wide ? 'lg:max-w-3xl' : 'lg:max-w-lg'}`}
      >
        <div className="relative flex shrink-0 items-center justify-between px-4 pb-2 pt-5 lg:px-6 lg:pt-5">
          <div className="absolute left-1/2 top-2 h-1.5 w-10 -translate-x-1/2 rounded-full bg-gray-300 lg:hidden" />
          <h2 className="text-base font-semibold lg:text-lg">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="關閉"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-600 tap lg:hover:bg-gray-200"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 lg:px-6">{children}</div>
        {footer && <div className="shrink-0 border-t border-gray-100 bg-white px-4 py-3 safe-bottom lg:rounded-b-3xl lg:px-6">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
