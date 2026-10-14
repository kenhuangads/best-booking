import type { NextRequest } from 'next/server';
import { getAirport } from '@/lib/airports';
import { fail, ok } from '@/lib/api';
import { errMsg } from '@/lib/env';
import { priceCalendar } from '@/lib/search';
import { CABINS, type Cabin } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const from = (sp.get('from') ?? '').toUpperCase();
  const to = (sp.get('to') ?? '').toUpperCase();
  const month = sp.get('month') ?? '';
  if (!/^\d{4}-\d{2}$/.test(month)) return fail('month 格式須為 YYYY-MM');
  if (!getAirport(from) || !getAirport(to) || from === to) return fail('機場代碼無效');
  const lenRaw = sp.get('len');
  const tripLength = lenRaw == null || lenRaw === '' ? null : Number(lenRaw);
  if (tripLength != null && (!Number.isInteger(tripLength) || tripLength < 0 || tripLength > 60)) return fail('len 須為 0–60 的整數');
  const cabinRaw = sp.get('cabin') ?? 'ECONOMY';
  const cabin: Cabin = (CABINS as string[]).includes(cabinRaw) ? (cabinRaw as Cabin) : 'ECONOMY';
  const carriers = (sp.get('airlines') ?? '')
    .split(',')
    .map((s) => s.trim().toUpperCase())
    .filter((s) => /^[A-Z0-9]{2}$/.test(s));
  try {
    return ok(await priceCalendar(from, to, month, tripLength, cabin, carriers.length ? carriers : undefined));
  } catch (e) {
    return fail(errMsg(e), 502);
  }
}
