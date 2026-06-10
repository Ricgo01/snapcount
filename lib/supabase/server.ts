import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Server-side Supabase clients.
 * Both return null when env vars are missing so callers can degrade
 * gracefully (same philosophy as espnFetch → mock fallback).
 */

let readClient: SupabaseClient | null | undefined;
let adminClient: SupabaseClient | null | undefined;

/** Read-only client (publishable key). RLS allows public SELECT on games. */
export function supabaseRead(): SupabaseClient | null {
  if (readClient !== undefined) return readClient;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  readClient = url && key ? createClient(url, key, { auth: { persistSession: false } }) : null;
  if (!readClient) console.warn('[supabase] read client unavailable — missing NEXT_PUBLIC_SUPABASE_* env vars');
  return readClient;
}

/** Admin client (secret key) — server-only, bypasses RLS. Used for writes. */
export function supabaseAdmin(): SupabaseClient | null {
  if (adminClient !== undefined) return adminClient;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  adminClient = url && key ? createClient(url, key, { auth: { persistSession: false } }) : null;
  if (!adminClient) console.warn('[supabase] admin client unavailable — missing SUPABASE_SECRET_KEY');
  return adminClient;
}
