import { ok } from '@/lib/api';
import { runDueWatches } from '@/lib/watcher';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST() {
  const outcomes = await runDueWatches({ force: true });
  return ok({ outcomes });
}
