/** 前端呼叫 API 的小工具（SWR fetcher 與 JSON 請求） */

async function parse<T>(r: Response): Promise<T> {
  const j = (await r.json().catch(() => ({}))) as { error?: string };
  if (!r.ok) throw new Error(j.error || `HTTP ${r.status}`);
  return j as T;
}

export async function fetcher<T>(url: string): Promise<T> {
  return parse<T>(await fetch(url));
}

export async function api<T>(url: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const r = await fetch(url, {
    method: init.method ?? 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
  return parse<T>(r);
}

export function errText(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

export function loadLocal<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? { ...fallback, ...(JSON.parse(raw) as Partial<T>) } : fallback;
  } catch {
    return fallback;
  }
}

export function saveLocal(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}
