import { timingSafeEqual } from 'node:crypto';

/**
 * Constant-time check of the `Authorization: Bearer <CRON_SECRET>` header.
 * Plain `!==` short-circuits on the first differing byte, which in theory
 * leaks secret prefixes through response timing.
 */
export function checkCronAuth(authHeader: string | null, secret: string): boolean {
  const expected = Buffer.from(`Bearer ${secret}`);
  const received = Buffer.from(authHeader ?? '');
  return received.length === expected.length && timingSafeEqual(received, expected);
}
