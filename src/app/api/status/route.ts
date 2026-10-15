import { ok } from '@/lib/api';
import { getDb } from '@/lib/db';
import { env, errMsg } from '@/lib/env';
import { schedulerStatus } from '@/lib/scheduler';
import { calendarProvider } from '@/lib/search';
import { serpPlan } from '@/lib/quota';
import { listWatches } from '@/lib/repo';
import type { StatusResponse } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  let db: StatusResponse['db'];
  try {
    const d = await getDb();
    db = { backend: d.backend, persistent: d.persistent, location: d.location, error: null };
  } catch (e) {
    db = {
      backend: env.turso.configured ? 'turso' : 'sqlite',
      persistent: false,
      location: env.turso.configured ? env.turso.url.replace(/\?.*$/, '') : env.sqlitePath,
      error: errMsg(e),
    };
  }
  let serp: StatusResponse['serp'] = null;
  try {
    serp = await serpPlan(await listWatches());
  } catch {
    serp = null;
  }
  const body: StatusResponse = {
    serp,
    providers: {
      flight: env.flightProvider,
      hotel: env.hotelProvider,
      radar: env.radarProvider,
      amadeusEnv: env.amadeus.configured ? (env.amadeus.production ? 'production' : 'test') : null,
    },
    line: { configured: env.line.configured, basicId: env.line.basicId, addFriendUrl: env.line.addFriendUrl },
    telegram: { configured: env.telegram.configured, username: env.telegram.username, polling: env.telegram.polling },
    scheduler: schedulerStatus(),
    db,
    serverless: env.isServerless,
    appUrl: env.appUrl,
    passwordProtected: !!env.appPassword,
    features: { calendar: calendarProvider() !== null },
  };
  return ok(body);
}
