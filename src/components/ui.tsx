'use client';

import type { ReactNode } from 'react';

export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  className = '',
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: ReactNode }[];
  className?: string;
}) {
  return (
    <div className={`grid rounded-xl bg-gray-200/70 p-1 ${className}`} style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          aria-pressed={value === o.value}
          className={`h-10 rounded-lg text-sm font-medium transition ${
            value === o.value ? 'bg-white text-brand-700 shadow-sm' : 'text-gray-500'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function FieldButton({
  label,
  value,
  placeholder = '請選擇',
  onClick,
  className = '',
  align = 'left',
}: {
  label: string;
  value?: ReactNode;
  placeholder?: string;
  onClick: () => void;
  className?: string;
  align?: 'left' | 'right';
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-[64px] w-full flex-col justify-center px-4 py-2 text-left tap ${align === 'right' ? 'items-end text-right' : ''} ${className}`}
    >
      <span className="text-xs text-gray-500">{label}</span>
      <span className={`mt-0.5 text-base font-semibold ${value ? 'text-gray-900' : 'text-gray-400'}`}>{value ?? placeholder}</span>
    </button>
  );
}

export function Toggle({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: ReactNode; hint?: string }) {
  return (
    <label className="flex min-h-[52px] cursor-pointer items-center justify-between gap-3 px-4 py-2">
      <span>
        <span className="block text-sm font-medium">{label}</span>
        {hint && <span className="block text-xs text-gray-500">{hint}</span>}
      </span>
      <span
        role="switch"
        aria-checked={checked}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault();
            onChange(!checked);
          }
        }}
        onClick={(e) => {
          e.preventDefault();
          onChange(!checked);
        }}
        className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition ${checked ? 'bg-brand-600' : 'bg-gray-300'}`}
      >
        <span className={`inline-block h-6 w-6 rounded-full bg-white shadow transition ${checked ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
      </span>
    </label>
  );
}

export function Stepper({
  value,
  onChange,
  min,
  max,
  label,
  hint,
}: {
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  label: string;
  hint?: string;
}) {
  const btn = 'flex h-10 w-10 items-center justify-center rounded-full border border-gray-300 text-xl text-brand-700 disabled:opacity-30 tap';
  return (
    <div className="flex items-center justify-between py-3">
      <div>
        <div className="text-sm font-medium">{label}</div>
        {hint && <div className="text-xs text-gray-500">{hint}</div>}
      </div>
      <div className="flex items-center gap-3">
        <button type="button" className={btn} disabled={value <= min} onClick={() => onChange(value - 1)} aria-label={`減少${label}`}>
          −
        </button>
        <span className="w-6 text-center text-base font-semibold tabular-nums">{value}</span>
        <button type="button" className={btn} disabled={value >= max} onClick={() => onChange(value + 1)} aria-label={`增加${label}`}>
          +
        </button>
      </div>
    </div>
  );
}

export function Chip({ active = false, onClick, children, className = '' }: { active?: boolean; onClick?: () => void; children: ReactNode; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex h-9 shrink-0 items-center gap-1 whitespace-nowrap rounded-full border px-3.5 text-sm font-medium tap ${
        active ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-gray-200 bg-white text-gray-700'
      } ${className}`}
    >
      {children}
    </button>
  );
}

export function PrimaryButton({
  children,
  onClick,
  disabled,
  loading,
  className = '',
  type = 'button',
  variant = 'primary',
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  type?: 'button' | 'submit';
  variant?: 'primary' | 'secondary' | 'danger' | 'line' | 'telegram';
}) {
  const styles = {
    primary: 'bg-brand-600 text-white shadow-lg shadow-brand-600/25',
    secondary: 'bg-white text-gray-800 border border-gray-200',
    danger: 'bg-red-50 text-red-600 border border-red-100',
    line: 'bg-line text-white',
    telegram: 'bg-telegram text-white',
  }[variant];
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`flex h-12 w-full items-center justify-center gap-2 rounded-2xl text-base font-semibold disabled:opacity-50 tap ${styles} ${className}`}
    >
      {loading && <Spinner className="h-4 w-4" />}
      {children}
    </button>
  );
}

export function Spinner({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
      <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton ${className}`} aria-hidden />;
}

export function EmptyState({ icon, title, hint, action }: { icon: string; title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <div className="text-5xl">{icon}</div>
      <div className="mt-3 text-base font-semibold">{title}</div>
      {hint && <div className="mt-1 text-sm text-gray-500">{hint}</div>}
      {action && <div className="mt-5 w-full max-w-[260px]">{action}</div>}
    </div>
  );
}

export function Tag({ children, tone = 'default' }: { children: ReactNode; tone?: 'default' | 'muted' | 'ok' | 'warn' }) {
  const cls = {
    default: 'bg-gray-100 text-gray-600',
    muted: 'bg-gray-50 text-gray-400',
    ok: 'bg-emerald-50 text-emerald-700',
    warn: 'bg-orange-50 text-orange-700',
  }[tone];
  return <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-medium ${cls}`}>{children}</span>;
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl bg-white shadow-card ${className}`}>{children}</div>;
}

export function PageHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: ReactNode }) {
  return (
    <header className="sticky top-0 z-30 border-b border-gray-200/70 bg-gray-50/95 px-4 pb-3 pt-4 backdrop-blur safe-top">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">{title}</h1>
          {subtitle && <p className="mt-0.5 text-xs text-gray-500">{subtitle}</p>}
        </div>
        {right}
      </div>
    </header>
  );
}
