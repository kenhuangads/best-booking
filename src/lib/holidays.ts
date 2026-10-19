/**
 * 台灣國定假日與連續假期（供日期選擇器標示與旺季價格估算）。
 * 2026 依行政院人事行政總處 115 年行事曆；2027–2028 為依《紀念日及節日實施條例》推算之預估值，
 * 以人事行政總處正式公告為準。
 */
export interface Holiday {
  date: string;
  name: string;
  short: string;
  estimated?: boolean;
}
export interface LongWeekend {
  name: string;
  start: string;
  end: string;
  estimated?: boolean;
}

export const HOLIDAYS: Holiday[] = [
  // ── 2026 ──
  { date: '2026-01-01', name: '元旦', short: '元旦' },
  { date: '2026-02-15', name: '小年夜', short: '小年夜' },
  { date: '2026-02-16', name: '除夕', short: '除夕' },
  { date: '2026-02-17', name: '春節初一', short: '初一' },
  { date: '2026-02-18', name: '春節初二', short: '初二' },
  { date: '2026-02-19', name: '春節初三', short: '初三' },
  { date: '2026-02-20', name: '春節補假', short: '補假' },
  { date: '2026-02-27', name: '和平紀念日補假', short: '補假' },
  { date: '2026-02-28', name: '和平紀念日', short: '228' },
  { date: '2026-04-03', name: '兒童節補假', short: '補假' },
  { date: '2026-04-04', name: '兒童節', short: '兒童節' },
  { date: '2026-04-05', name: '清明節', short: '清明' },
  { date: '2026-04-06', name: '清明節補假', short: '補假' },
  { date: '2026-05-01', name: '勞動節', short: '勞動節' },
  { date: '2026-06-19', name: '端午節', short: '端午' },
  { date: '2026-09-25', name: '中秋節', short: '中秋' },
  { date: '2026-09-28', name: '教師節', short: '教師節' },
  { date: '2026-10-09', name: '國慶日補假', short: '補假' },
  { date: '2026-10-10', name: '國慶日', short: '國慶' },
  { date: '2026-10-25', name: '光復節', short: '光復節' },
  { date: '2026-10-26', name: '光復節補假', short: '補假' },
  { date: '2026-12-25', name: '行憲紀念日', short: '行憲' },
  // ── 2027（預估） ──
  { date: '2027-01-01', name: '元旦', short: '元旦', estimated: true },
  { date: '2027-02-04', name: '小年夜', short: '小年夜', estimated: true },
  { date: '2027-02-05', name: '除夕', short: '除夕', estimated: true },
  { date: '2027-02-06', name: '春節初一', short: '初一', estimated: true },
  { date: '2027-02-07', name: '春節初二', short: '初二', estimated: true },
  { date: '2027-02-08', name: '春節初三', short: '初三', estimated: true },
  { date: '2027-02-09', name: '春節補假', short: '補假', estimated: true },
  { date: '2027-02-10', name: '春節補假', short: '補假', estimated: true },
  { date: '2027-02-28', name: '和平紀念日', short: '228', estimated: true },
  { date: '2027-03-01', name: '和平紀念日補假', short: '補假', estimated: true },
  { date: '2027-04-04', name: '兒童節', short: '兒童節', estimated: true },
  { date: '2027-04-05', name: '清明節', short: '清明', estimated: true },
  { date: '2027-04-06', name: '兒童節補假', short: '補假', estimated: true },
  { date: '2027-04-30', name: '勞動節補假', short: '補假', estimated: true },
  { date: '2027-05-01', name: '勞動節', short: '勞動節', estimated: true },
  { date: '2027-06-09', name: '端午節', short: '端午', estimated: true },
  { date: '2027-09-15', name: '中秋節', short: '中秋', estimated: true },
  { date: '2027-09-28', name: '教師節', short: '教師節', estimated: true },
  { date: '2027-10-10', name: '國慶日', short: '國慶', estimated: true },
  { date: '2027-10-11', name: '國慶日補假', short: '補假', estimated: true },
  { date: '2027-10-25', name: '光復節', short: '光復節', estimated: true },
  { date: '2027-12-24', name: '行憲紀念日補假', short: '補假', estimated: true },
  { date: '2027-12-25', name: '行憲紀念日', short: '行憲', estimated: true },
  // ── 2028（預估，日期選擇器最遠到 18 個月後） ──
  { date: '2027-12-31', name: '元旦補假', short: '補假', estimated: true },
  { date: '2028-01-01', name: '元旦', short: '元旦', estimated: true },
  { date: '2028-01-24', name: '小年夜', short: '小年夜', estimated: true },
  { date: '2028-01-25', name: '除夕', short: '除夕', estimated: true },
  { date: '2028-01-26', name: '春節初一', short: '初一', estimated: true },
  { date: '2028-01-27', name: '春節初二', short: '初二', estimated: true },
  { date: '2028-01-28', name: '春節初三', short: '初三', estimated: true },
  { date: '2028-02-28', name: '和平紀念日', short: '228', estimated: true },
  { date: '2028-04-03', name: '兒童節（與清明同日，提前一天）', short: '兒童節', estimated: true },
  { date: '2028-04-04', name: '清明節', short: '清明', estimated: true },
];

export const LONG_WEEKENDS: LongWeekend[] = [
  { name: '春節', start: '2026-02-14', end: '2026-02-22' },
  { name: '228 連假', start: '2026-02-27', end: '2026-03-01' },
  { name: '清明連假', start: '2026-04-03', end: '2026-04-06' },
  { name: '勞動節連假', start: '2026-05-01', end: '2026-05-03' },
  { name: '端午連假', start: '2026-06-19', end: '2026-06-21' },
  { name: '中秋教師節連假', start: '2026-09-25', end: '2026-09-28' },
  { name: '國慶連假', start: '2026-10-09', end: '2026-10-11' },
  { name: '光復節連假', start: '2026-10-24', end: '2026-10-26' },
  { name: '聖誕行憲連假', start: '2026-12-25', end: '2026-12-27' },
  { name: '元旦連假', start: '2027-01-01', end: '2027-01-03', estimated: true },
  { name: '春節', start: '2027-02-04', end: '2027-02-10', estimated: true },
  { name: '228 連假', start: '2027-02-27', end: '2027-03-01', estimated: true },
  { name: '清明連假', start: '2027-04-03', end: '2027-04-06', estimated: true },
  { name: '勞動節連假', start: '2027-04-30', end: '2027-05-02', estimated: true },
  { name: '國慶連假', start: '2027-10-09', end: '2027-10-11', estimated: true },
  { name: '光復節連假', start: '2027-10-23', end: '2027-10-25', estimated: true },
  { name: '聖誕行憲連假', start: '2027-12-24', end: '2027-12-26', estimated: true },
  { name: '元旦連假', start: '2027-12-31', end: '2028-01-02', estimated: true },
  { name: '春節', start: '2028-01-22', end: '2028-01-30', estimated: true },
  { name: '228 連假', start: '2028-02-26', end: '2028-02-28', estimated: true },
  { name: '清明連假', start: '2028-04-01', end: '2028-04-04', estimated: true },
];

export const HOLIDAY_MAP = new Map(HOLIDAYS.map((h) => [h.date, h]));

export function getHoliday(date: string): Holiday | undefined {
  return HOLIDAY_MAP.get(date);
}

export function inLongWeekend(date: string): LongWeekend | undefined {
  return LONG_WEEKENDS.find((lw) => date >= lw.start && date <= lw.end);
}

/** 區間是否與任何連假重疊（用來估計旺季價格） */
export function overlapsLongWeekend(start: string, end?: string | null): boolean {
  const e = end ?? start;
  return LONG_WEEKENDS.some((lw) => start <= lw.end && e >= lw.start);
}

export function upcomingLongWeekends(fromISO: string, n = 8): LongWeekend[] {
  return LONG_WEEKENDS.filter((lw) => lw.end >= fromISO).slice(0, n);
}
