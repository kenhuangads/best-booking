import type { NextRequest } from 'next/server';
import { fail, ok } from '@/lib/api';
import { errMsg } from '@/lib/env';
import { parseFlightQuery } from '@/lib/schemas';
import { searchFlights } from '@/lib/search';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const parsed = parseFlightQuery(req.nextUrl.searchParams);
  if (!parsed.ok) return fail(parsed.error);
  try {
    const fresh = req.nextUrl.searchParams.get('fresh') === '1';
    return ok(await searchFlights(parsed.value, { bypassCache: fresh }));
  } catch (e) {
    return fail(errMsg(e), 502);
  }
}
