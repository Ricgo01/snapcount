/**
 * espnFetch — thin fetch wrapper around ESPN's hidden API.
 *
 * - Tags responses for Next.js Data Cache so `revalidateTag('espn-all')`
 *   from /api/refresh invalidates everything in one call.
 * - Returns null on any network/parse error → callers fall back to mock data.
 * - revalidate: 300 s (5 min) — aligns with the GitHub Actions cron cadence.
 */
/**
 * espnFetch — thin fetch wrapper.
 * Uses Next.js Data Cache with a TTL revalidation (no tags needed —
 * the /api/refresh route uses revalidatePath to purge all pages at once).
 */
export async function espnFetch<T>(
  url: string,
  _tag: string,          // kept for call-site documentation; not used for tagging
  revalidate = 300,
): Promise<T | null> {
  try {
    const res = await fetch(url, {
      next: { revalidate },
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; RedZoneStats/1.0)' },
    });
    if (!res.ok) {
      console.warn(`[ESPN] ${res.status} for ${url}`);
      return null;
    }
    return (await res.json()) as T;
  } catch (err) {
    console.warn(`[ESPN] fetch error for ${url}:`, err);
    return null;
  }
}
