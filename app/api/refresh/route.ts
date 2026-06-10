import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { syncScoreboard } from '@/lib/services/history';
import { syncFinalGameStats } from '@/lib/services/game-stats';
import { checkCronAuth } from '@/lib/utils/cron-auth';

/**
 * POST /api/refresh
 * Invalidates all ESPN-tagged Next.js Data Cache entries, persists the
 * current scoreboard into Supabase (game history), and stores box-score
 * stats for games that just turned final.
 * Protected by CRON_SECRET — called by the GitHub Actions cron every 5 min.
 *
 * Usage:
 *   curl -X POST https://your-app.vercel.app/api/refresh \
 *        -H "Authorization: Bearer <CRON_SECRET>"
 */
export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization');
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    // Misconfigured server — fail loudly in logs, silently to client
    console.error('[refresh] CRON_SECRET env var is not set');
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
  }

  if (!checkCronAuth(auth, secret)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Revalidate the root layout — cascades to all pages, forcing re-fetch from ESPN
  revalidatePath('/', 'layout');

  // Persist current scoreboard into Supabase — non-fatal if it fails
  const { synced, finalIds } = await syncScoreboard().catch(err => {
    console.error('[refresh] history sync failed:', err);
    return { synced: 0, finalIds: [] as string[] };
  });

  // Store box-score stats for finished games that don't have them yet
  const statsSynced = await syncFinalGameStats(finalIds).catch(err => {
    console.error('[refresh] stats sync failed:', err);
    return 0;
  });

  console.log(`[refresh] cache invalidated, ${synced} games + ${statsSynced} box scores synced at`, new Date().toISOString());
  return NextResponse.json({ revalidated: true, synced, statsSynced, ts: Date.now() });
}

// Reject GET requests to prevent accidental browser visits
export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}
