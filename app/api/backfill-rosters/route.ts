import { NextRequest, NextResponse } from 'next/server';
import { backfillRosters } from '@/lib/services/roster';
import { CURRENT_ESPN_YEAR, EARLIEST_ESPN_YEAR } from '@/lib/espn/endpoints';
import { checkCronAuth } from '@/lib/utils/cron-auth';

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
  const auth = req.headers.get('authorization');
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    console.error('[backfill-rosters] CRON_SECRET env var is not set');
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
  }
  if (!checkCronAuth(auth, secret)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const seasonParam = req.nextUrl.searchParams.get('season');
  const year = seasonParam ? parseInt(seasonParam, 10) : CURRENT_ESPN_YEAR;
  if (Number.isNaN(year) || year < EARLIEST_ESPN_YEAR || year > CURRENT_ESPN_YEAR) {
    return NextResponse.json(
      { error: `season must be between ${EARLIEST_ESPN_YEAR} and ${CURRENT_ESPN_YEAR}` },
      { status: 400 },
    );
  }

  const result = await backfillRosters(year);
  console.log('[backfill-rosters]', result);
  return NextResponse.json(result);
}

export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}
