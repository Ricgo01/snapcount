import { NextRequest, NextResponse } from 'next/server';
import { backfillSeason } from '@/lib/services/history';
import { requireCronAuth, parseSeasonYear, checkBackfillCooldown } from '@/lib/utils/cron-route';

export const maxDuration = 300; // 18 sequential ESPN requests per season

/**
 * POST /api/backfill?season=2024
 * Loads a full NFL season (weeks 1-18) from ESPN into Supabase game history.
 * Run once per season. Protected by CRON_SECRET.
 *
 * Usage:
 *   curl -X POST "https://your-app.vercel.app/api/backfill?season=2024" \
 *        -H "Authorization: Bearer <CRON_SECRET>"
 */
export async function POST(req: NextRequest) {
  const authFail = requireCronAuth(req, 'backfill');
  if (authFail) return authFail;

  const parsed = parseSeasonYear(req.nextUrl.searchParams);
  if (parsed instanceof NextResponse) return parsed;
  const { year } = parsed;

  const cooldown = await checkBackfillCooldown('backfill', 'games', year);
  if (cooldown) return cooldown;

  const result = await backfillSeason(year);
  console.log('[backfill]', result);
  return NextResponse.json(result);
}

export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}
