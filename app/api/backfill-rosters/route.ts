import { NextRequest, NextResponse } from 'next/server';
import { backfillRosters } from '@/lib/services/roster';
import { requireCronAuth, parseSeasonYear, checkBackfillCooldown } from '@/lib/utils/cron-route';

export const maxDuration = 300; // nflverse CSVs reach ~50 MB for recent seasons

/**
 * POST /api/backfill-rosters?season=2007
 * Loads one season's depth charts from nflverse into Supabase (table rosters).
 * Run once per season. Protected by CRON_SECRET.
 *
 * Usage:
 *   curl -X POST "https://your-app.vercel.app/api/backfill-rosters?season=2007" \
 *        -H "Authorization: Bearer <CRON_SECRET>"
 */
export async function POST(req: NextRequest) {
  const authFail = requireCronAuth(req, 'backfill-rosters');
  if (authFail) return authFail;

  const parsed = parseSeasonYear(req.nextUrl.searchParams);
  if (parsed instanceof NextResponse) return parsed;
  const { year } = parsed;

  const cooldown = await checkBackfillCooldown('backfill-rosters', 'rosters', year);
  if (cooldown) return cooldown;

  const result = await backfillRosters(year);
  console.log('[backfill-rosters]', result);
  return NextResponse.json(result);
}

export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}
