import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';

/**
 * POST /api/refresh
 * Invalidates all ESPN-tagged Next.js Data Cache entries.
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

  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Revalidate the root layout — cascades to all pages, forcing re-fetch from ESPN
  revalidatePath('/', 'layout');

  console.log('[refresh] ESPN cache invalidated at', new Date().toISOString());
  return NextResponse.json({ revalidated: true, ts: Date.now() });
}

// Reject GET requests to prevent accidental browser visits
export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}
