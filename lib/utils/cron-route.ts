import { NextRequest, NextResponse } from 'next/server';
import { checkCronAuth } from './cron-auth';
import { supabaseRead } from '@/lib/supabase/server';
import { EARLIEST_ESPN_YEAR, CURRENT_ESPN_YEAR } from '@/lib/espn/endpoints';

/**
 * Shared guards for the CRON_SECRET-protected routes (/api/refresh,
 * /api/backfill, /api/backfill-rosters) — extracted so all three stay
 * behaviorally identical instead of drifting via copy-paste.
 */

/**
 * Verifies CRON_SECRET on a protected route. Returns a NextResponse to send
 * immediately on failure (missing secret → 500, bad/missing auth → 401 with
 * a warning log), or null when the request is authorized and should proceed.
 */
export function requireCronAuth(req: NextRequest, routeName: string): NextResponse | null {
  const auth = req.headers.get('authorization');
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    // Misconfigured server — fail loudly in logs, silently to client
    console.error(`[${routeName}] CRON_SECRET env var is not set`);
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
  }
  if (!checkCronAuth(auth, secret)) {
    console.warn(`[${routeName}] rejected unauthorized request`, {
      path: req.nextUrl.pathname,
      ip: req.headers.get('x-forwarded-for') ?? 'unknown',
    });
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return null;
}

/** Parses & validates the `season` query param shared by /api/backfill*. */
export function parseSeasonYear(searchParams: URLSearchParams): { year: number } | NextResponse {
  const seasonParam = searchParams.get('season');
  const year = seasonParam ? parseInt(seasonParam, 10) : CURRENT_ESPN_YEAR;
  if (Number.isNaN(year) || year < EARLIEST_ESPN_YEAR || year > CURRENT_ESPN_YEAR) {
    return NextResponse.json(
      { error: `season must be between ${EARLIEST_ESPN_YEAR} and ${CURRENT_ESPN_YEAR}` },
      { status: 400 },
    );
  }
  return { year };
}

// 1h — comfortably longer than a single backfill run, short enough to allow
// a legitimate same-day retry. Bounds the cost of a leaked CRON_SECRET or a
// misfiring automation re-triggering an expensive route repeatedly.
const COOLDOWN_MS = 60 * 60 * 1000;

/**
 * Skips a backfill-style route if it already ran for this season within the
 * cooldown window. Fails open (returns null, letting the caller proceed) if
 * Supabase is unreachable — CRON_SECRET stays the primary gate.
 */
export async function checkBackfillCooldown(
  routeName: string,
  table: 'games' | 'rosters',
  year: number,
): Promise<NextResponse | null> {
  const db = supabaseRead();
  if (!db) return null;

  const { data: recent, error } = await db
    .from(table)
    .select('updated_at')
    .eq('season', year)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.warn(`[${routeName}] cooldown check failed, proceeding:`, error.message);
    return null;
  }
  if (!recent) return null;

  const elapsedMs = Date.now() - new Date(recent.updated_at).getTime();
  if (elapsedMs >= COOLDOWN_MS) return null;

  const retryAfter = Math.ceil((COOLDOWN_MS - elapsedMs) / 1000);
  return NextResponse.json(
    { error: 'Backfill for this season ran recently, try again later' },
    { status: 429, headers: { 'Retry-After': String(retryAfter) } },
  );
}
