import { fetchTeamWeekStats, fetchPlayerWeekStats, toGameStatsResult, toPlayerStatsTeam } from '@/lib/nflverse/stats';
import { supabaseRead, supabaseAdmin } from '@/lib/supabase/server';
import type { GameStatsResult, PlayerStatsResult } from '@/types/nfl';

interface GameLookupRow {
  id: string;
  nflverse_game_id: string | null;
  season: number;
  home_team: string;
  away_team: string;
}

/**
 * Per-game stats backed by Supabase (table: public.game_details).
 *
 * Cache-aside: game pages read stored stats first; the /api/refresh cron
 * stores stats for games as they turn final (syncFinalGameStats), sourced
 * from nflverse's per-season stats_team/stats_player files.
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

/**
 * Persist parsed stats for a finished game. No-op without the admin client.
 * Returns false only on a real Supabase write error (not on a no-op), so
 * callers can distinguish "nothing to store" from "storing actually failed".
 */
export async function storeGameStats(
  gameId: string,
  teamStats: GameStatsResult | null,
  playerStats: PlayerStatsResult | null,
): Promise<boolean> {
  const db = supabaseAdmin();
  if (!db || (!teamStats && !playerStats)) return true;

  const { error } = await db.from('game_details').upsert(
    { game_id: gameId, team_stats: teamStats, player_stats: playerStats, updated_at: new Date().toISOString() },
    { onConflict: 'game_id' },
  );
  if (error) {
    console.warn('[game-stats] store failed:', error.message);
    return false;
  }
  return true;
}

/**
 * Store stats for finished games that don't have them yet.
 * Called from /api/refresh with the current scoreboard's final game IDs.
 * Fetches each distinct season's nflverse stats files once (not per game),
 * then joins by `nflverse_game_id` — cheaper than the old one-request-per-game
 * ESPN approach.
 */
export async function syncFinalGameStats(gameIds: string[]): Promise<{ stored: number; failed: boolean }> {
  const db = supabaseAdmin();
  if (!db || !gameIds.length) return { stored: 0, failed: false };

  const { data: have, error: haveErr } = await db
    .from('game_details')
    .select('game_id')
    .in('game_id', gameIds);
  if (haveErr) {
    console.warn('[game-stats] sync lookup failed:', haveErr.message);
    return { stored: 0, failed: true };
  }
  const already = new Set((have ?? []).map(r => r.game_id as string));
  const pending = gameIds.filter(id => !already.has(id));
  if (!pending.length) return { stored: 0, failed: false };

  const { data: games, error: gamesErr } = await db
    .from('games')
    .select('id, nflverse_game_id, season, home_team, away_team')
    .in('id', pending);
  if (gamesErr) {
    console.warn('[game-stats] games lookup failed:', gamesErr.message);
    return { stored: 0, failed: true };
  }
  const rows = ((games ?? []) as GameLookupRow[]).filter(g => g.nflverse_game_id);
  if (!rows.length) return { stored: 0, failed: false };

  const seasons = [...new Set(rows.map(g => g.season))];
  let stored = 0;
  let failed = false;

  for (const season of seasons) {
    const [teamStats, playerStats] = await Promise.all([
      fetchTeamWeekStats(season),
      fetchPlayerWeekStats(season),
    ]);
    if (!teamStats.length && !playerStats.length) continue;

    for (const g of rows.filter(g => g.season === season)) {
      const teamRows = teamStats.filter(r => r.gameId === g.nflverse_game_id);
      const home = teamRows.find(r => r.team === g.home_team);
      const away = teamRows.find(r => r.team === g.away_team);
      const teamResult = home && away ? toGameStatsResult(home, away) : null;

      const gamePlayers = playerStats.filter(r => r.gameId === g.nflverse_game_id);
      const homePlayers = gamePlayers.filter(p => p.team === g.home_team);
      const awayPlayers = gamePlayers.filter(p => p.team === g.away_team);
      const playerResult: PlayerStatsResult | null = homePlayers.length && awayPlayers.length
        ? { home: toPlayerStatsTeam(homePlayers), away: toPlayerStatsTeam(awayPlayers) }
        : null;

      if (!teamResult && !playerResult) continue;
      if (await storeGameStats(g.id, teamResult, playerResult)) stored++;
      else failed = true;
    }
  }

  return { stored, failed };
}
