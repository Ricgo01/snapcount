import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { syncScoreboard } from '@/lib/services/history';
import { syncFinalGameStats } from '@/lib/services/game-stats';
import { requireCronAuth } from '@/lib/utils/cron-route';

/**
 * POST /api/refresh
 * Invalidates all ESPN-tagged Next.js Data Cache entries, persists the
 * current scoreboard into Supabase (game history), and stores box-score
 * stats for games that just turned final.
 * Protected by CRON_SECRET — called by the GitHub Actions cron every 5 min.
 * Unlike /api/backfill* this route has no cooldown of its own: it's cheap,
 * idempotent, and designed to run every 5 minutes, so a cooldown would fight
 * its own purpose. It's still bounded by proxy.ts's per-IP rate limiter.
 *
 * Usage:
 *   curl -X POST https://your-app.vercel.app/api/refresh \
 *        -H "Authorization: Bearer <CRON_SECRET>"
 */
export async function POST(req: NextRequest) {
  const authFail = requireCronAuth(req, 'refresh');
  if (authFail) return authFail;

  // Revalidate the root layout — cascades to all pages, forcing re-fetch from ESPN
  revalidatePath('/', 'layout');

  // Persist current scoreboard into Supabase. `ok` distinguishes "nothing to
  // sync" (e.g. a bye day — 0 games, healthy) from "the sync actually failed"
  // — either a thrown exception or a soft Supabase error — so the cron
  // workflow can tell the two apart via the status code.
  const { synced, finalIds, failed: scoreboardFailed } = await syncScoreboard().catch(err => {
    console.error('[refresh] history sync failed:', err);
    return { synced: 0, finalIds: [] as string[], failed: true };
  });

  // Store box-score stats for finished games that don't have them yet
  const { stored: statsSynced, failed: statsFailed } = await syncFinalGameStats(finalIds).catch(err => {
    console.error('[refresh] stats sync failed:', err);
    return { stored: 0, failed: true };
  });

  const ok = !scoreboardFailed && !statsFailed;
  console.log(`[refresh] cache invalidated, ${synced} games + ${statsSynced} box scores synced (ok=${ok}) at`, new Date().toISOString());
  return NextResponse.json(
    { revalidated: true, synced, statsSynced, ok, ts: Date.now() },
    { status: ok ? 200 : 207 },
  );
}

// Reject GET requests to prevent accidental browser visits
export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}
