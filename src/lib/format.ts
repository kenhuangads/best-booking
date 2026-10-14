export const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

export function fmtPrice(n: number | null | undefined, currency = 'TWD'): string {
  if (n == null || Number.isNaN(n)) return '—';
  const v = Math.round(n);
  if (currency === 'TWD') return `NT$ ${v.toLocaleString('zh-TW')}`;
  return `${currency} ${v.toLocaleString('en-US')}`;
}

export function parseISO(d: string): Date {
  const [y, m, dd] = d.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, dd);
}

export function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

export function todayISO(): string {
  return toISO(new Date());
}

export function addDays(iso: string, n: number): string {
  const d = parseISO(iso);
  d.setDate(d.getDate() + n);
  return toISO(d);
}

export function diffDays(a: string, b: string): number {
  return Math.round((parseISO(b).getTime() - parseISO(a).getTime()) / 86400000);
}

export function weekday(iso: string): string {
  return WEEKDAYS[parseISO(iso).getDay()];
}

/** 11/1 (日) */
export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const [, m, d] = iso.slice(0, 10).split('-');
  return `${Number(m)}/${Number(d)} (${weekday(iso)})`;
}

/** 2026/11/01 (日) */
export function fmtDateFull(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${y}/${m}/${d} (${weekday(iso)})`;
}

/** 11/1 (日) – 11/5 (四) */
export function fmtRange(start: string, end?: string | null): string {
  return end ? `${fmtDate(start)} – ${fmtDate(end)}` : fmtDate(start);
}

export function fmtTime(dt: string): string {
  return dt.length >= 16 ? dt.slice(11, 16) : dt;
}

export function fmtDuration(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}分`;
  return m > 0 ? `${h}小時${m}分` : `${h}小時`;
}

export function relTime(iso: string | null | undefined): string {
  if (!iso) return '尚未';
  const diff = Date.now() - Date.parse(iso);
  const min = Math.round(diff / 60000);
  if (min < 1) return '剛剛';
  if (min < 60) return `${min} 分鐘前`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h} 小時前`;
  return `${Math.round(h / 24)} 天前`;
}

export function monthLabel(ym: string): string {
  const [y, m] = ym.split('-');
  return `${y}年${Number(m)}月`;
}

export function intervalLabel(min: number): string {
  if (min < 60) return `${min} 分鐘`;
  if (min < 1440) return `${min / 60} 小時`;
  return `${min / 1440} 天`;
}

export function pct(n: number): string {
  return `${Math.round(n * 10) / 10}%`;
}
