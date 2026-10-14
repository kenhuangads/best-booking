'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { safeNext } from '@/lib/auth';

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const sp = useSearchParams();
  const next = safeNext(sp.get('next'));
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || loading) return;
    setLoading(true);
    setError(null);
    try {
      const r = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const j = (await r.json().catch(() => ({}))) as { error?: string };
      if (!r.ok) throw new Error(j.error || `登入失敗（${r.status}）`);
      window.location.replace(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-dvh items-center justify-center bg-gradient-to-br from-brand-700 via-brand-600 to-sky-500 px-4 py-10 safe-top">
      <form onSubmit={submit} className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl sm:p-8">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icons/icon-192.png" alt="" className="mx-auto h-16 w-16 rounded-2xl shadow-md" />
        <h1 className="mt-4 text-center text-xl font-bold">旅行預訂神器</h1>
        <p className="mt-1 text-center text-sm text-gray-500">請輸入密碼</p>

        {/* 讓 iPhone 鑰匙圈 / Google 密碼管理工具能存密碼 */}
        <input type="text" name="username" autoComplete="username" value="best-booking" readOnly tabIndex={-1} aria-hidden className="sr-only" />
        <label className="mt-6 block">
          <span className="sr-only">密碼</span>
          <div className="flex h-12 items-center rounded-xl border border-gray-200 bg-gray-50 pl-4 pr-2 focus-within:border-brand-500 focus-within:bg-white">
            <input
              type={show ? 'text' : 'password'}
              name="password"
              autoComplete="current-password"
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="密碼"
              className="h-full min-w-0 flex-1 bg-transparent text-base outline-none"
            />
            <button type="button" onClick={() => setShow(!show)} className="h-9 shrink-0 rounded-lg px-2 text-xs font-medium text-gray-500 tap">
              {show ? '隱藏' : '顯示'}
            </button>
          </div>
        </label>
        {error && (
          <p role="alert" className="mt-2 text-sm text-red-600">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={loading || !password}
          className="mt-4 h-12 w-full rounded-2xl bg-brand-600 font-semibold text-white shadow-lg shadow-brand-600/25 disabled:opacity-50 tap lg:hover:bg-brand-700"
        >
          {loading ? '登入中…' : '登入'}
        </button>
        <p className="mt-4 text-center text-xs leading-relaxed text-gray-400">登入後這台裝置會記住一年，加到主畫面的 App 也不用再輸入。</p>
      </form>
    </main>
  );
}
