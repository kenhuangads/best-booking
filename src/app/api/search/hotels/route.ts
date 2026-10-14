import type { NextRequest } from 'next/server';
import { fail, ok } from '@/lib/api';
import { errMsg } from '@/lib/env';
import { parseHotelQuery } from '@/lib/schemas';
import { searchHotels } from '@/lib/search';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const parsed = parseHotelQuery(req.nextUrl.searchParams);
  if (!parsed.ok) return fail(parsed.error);
  try {
    const fresh = req.nextUrl.searchParams.get('fresh') === '1';
    return ok(await searchHotels(parsed.value, { bypassCache: fresh }));
  } catch (e) {
    return fail(errMsg(e), 502);
  }
}
