import { espnUrls } from '@/lib/espn/endpoints';
import { espnBoxScoreToTeamStats, espnBoxScoreToPlayerStats } from '@/lib/espn/transform';
import { supabaseRead, supabaseAdmin } from '@/lib/supabase/server';
import type { EspnSummaryResponse } from '@/lib/espn/types';
import type { GameStatsResult, PlayerStatsResult } from '@/types/nfl';

/**
 * Per-game stats backed by Supabase (table: public.game_details).
 *
 * Cache-aside: game pages read stored stats first and fall back to the ESPN
 * summary, storing the parsed result for finished games. The /api/refresh
 * cron stores stats for games as they turn final (syncFinalGameStats).
 */

export interface StoredGameStats {
  teamStats: GameStatsResult | null;
  playerStats: PlayerStatsResult | null;
}

interface GameDetailRow {
  game_id: string;
  team_stats: GameStatsResult | null;
  player_stats: PlayerStatsResult | null;
}

/** Stored stats for one game, or null when not stored yet. */
export async function getStoredGameStats(gameId: string): Promise<StoredGameStats | null> {
  const db = supabaseRead();
  if (!db) return null;

  const { data, error } = await db
    .from('game_details')
    .select('game_id, team_stats, player_stats')
    .eq('game_id', gameId)
    .maybeSingle();

  if (error) {
    console.warn('[game-stats] read failed:', error.message);
    return null;
  }
  if (!data) return null;
  const row = data as GameDetailRow;
  return { teamStats: row.team_stats, playerStats: row.player_stats };
}

/** Persist parsed stats for a finished game. No-op without the admin client. */
export async function storeGameStats(
  gameId: string,
  teamStats: GameStatsResult | null,
  playerStats: PlayerStatsResult | null,
): Promise<void> {
  const db = supabaseAdmin();
  if (!db || (!teamStats && !playerStats)) return;

  const { error } = await db.from('game_details').upsert(
    { game_id: gameId, team_stats: teamStats, player_stats: playerStats, updated_at: new Date().toISOString() },
    { onConflict: 'game_id' },
  );
  if (error) console.warn('[game-stats] store failed:', error.message);
}

/** Direct ESPN summary fetch, always fresh (used right after a game ends). */
async function fetchSummary(eventId: string): Promise<EspnSummaryResponse | null> {
  try {
    const res = await fetch(espnUrls.summary(eventId), {
      cache: 'no-store',
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; RedZoneStats/1.0)' },
    });
    if (!res.ok) {
      console.warn(`[game-stats] ESPN ${res.status} for summary ${eventId}`);
      return null;
    }
    return (await res.json()) as EspnSummaryResponse;
  } catch (err) {
    console.warn(`[game-stats] ESPN fetch error for summary ${eventId}:`, err);
    return null;
  }
}

/** Parse a summary into stats using the raw ESPN abbreviations it contains. */
function parseSummary(raw: EspnSummaryResponse): StoredGameStats | null {
  const comp = raw.header?.competitions?.[0];
  const home = comp?.competitors.find(c => c.homeAway === 'home')?.team.abbreviation;
  const away = comp?.competitors.find(c => c.homeAway === 'away')?.team.abbreviation;
  if (!home || !away) return null;

  const teamStats   = espnBoxScoreToTeamStats(raw, home, away);
  const playerStats = espnBoxScoreToPlayerStats(raw, home, away);
  if (!teamStats && !playerStats) return null;
  return { teamStats, playerStats };
}

/**
 * Store stats for finished games that don't have them yet.
 * Called from /api/refresh with the current scoreboard's final game IDs —
 * each game costs one ESPN summary request, and only until stored.
 */
export async function syncFinalGameStats(gameIds: string[]): Promise<number> {
  const db = supabaseAdmin();
  if (!db || !gameIds.length) return 0;

  const { data, error } = await db
    .from('game_details')
    .select('game_id')
    .in('game_id', gameIds);
  if (error) {
    console.warn('[game-stats] sync lookup failed:', error.message);
    return 0;
  }
  const have = new Set((data ?? []).map(r => r.game_id as string));

  let stored = 0;
  for (const id of gameIds) {
    if (have.has(id)) continue;
    const raw = await fetchSummary(id);
    if (!raw) continue;
    const stats = parseSummary(raw);
    if (!stats) continue;
    await storeGameStats(id, stats.teamStats, stats.playerStats);
    stored++;
  }
  return stored;
}
