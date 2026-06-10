import { NextRequest, NextResponse } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

/**
 * Per-IP rate limiting for the whole app (pages + API).
 * 300 requests per 60 s sliding window, with Next.js link prefetches
 * exempted — pages like the home prefetch dozens of visible links, which
 * would burn a tight budget during normal human browsing. Floods that
 * would drain Supabase/Vercel quotas or hammer ESPN still get cut off.
 *
 * Fail-open by design: without Upstash env vars (local dev) or when Redis
 * errors, requests pass through. Volumetric L3/L4 DDoS is Vercel's job.
 */

const hasUpstash = Boolean(
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN,
);

const ratelimit = hasUpstash
  ? new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(300, '60 s'),
      prefix: 'snapcount-rl',
      analytics: false,
    })
  : null;

export async function proxy(req: NextRequest) {
  if (!ratelimit) return NextResponse.next();

  // Don't count speculative prefetches — only real navigations and API calls
  const isPrefetch =
    req.headers.get('next-router-prefetch') === '1' ||
    req.headers.get('purpose') === 'prefetch' ||
    (req.headers.get('sec-purpose') ?? '').includes('prefetch');
  if (isPrefetch) return NextResponse.next();

  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown';

  try {
    const { success, reset } = await ratelimit.limit(ip);
    if (!success) {
      const retryAfter = Math.max(1, Math.ceil((reset - Date.now()) / 1000));
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429, headers: { 'Retry-After': String(retryAfter) } },
      );
    }
  } catch (err) {
    console.warn('[ratelimit] check failed, allowing request:', err);
  }
  return NextResponse.next();
}

export const config = {
  // Everything except static assets and SEO files
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon.svg|robots.txt|sitemap.xml|logos/).*)'],
};
