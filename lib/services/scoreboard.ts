import { espnFetch } from '@/lib/espn/client';
import { espnUrls, seasonToYear } from '@/lib/espn/endpoints';
import { espnEventToGame } from '@/lib/espn/transform';
import { getWeekGames, getCurrentWeekNumber } from './history';
import { CURRENT_SEASON } from '@/lib/data';
import type { EspnScoreboardResponse } from '@/lib/espn/types';
import type { Game } from '@/types/nfl';

/**
 * Returns games for a given week and season, from Supabase (kept fresh by
 * the nflverse-backed /api/refresh cron for the current season, and by
 * /api/backfill for past ones). Returns [] when nothing is stored yet.
 */
export async function getScoreboard(
  week: number,
  season = CURRENT_SEASON,
): Promise<Game[]> {
  return getWeekGames(seasonToYear(season), week);
}

/**
 * Returns only currently live games.
 * Uses short revalidate (30 s) for active polling.
 */
export async function getLiveGames(season = CURRENT_SEASON): Promise<Game[]> {
  // Param-less scoreboard = ESPN's current context (live week)
  const raw = await espnFetch<EspnScoreboardResponse>(
    espnUrls.scoreboard(),
    'espn-scoreboard-live',
    30,
  );

  return (raw?.events ?? [])
    .map(e => espnEventToGame(e, season))
    .filter((g): g is Game => g !== null && g.status === 'live');
}

/** Returns the current (or last) week number for a season. */
export async function getCurrentWeek(season = CURRENT_SEASON): Promise<number> {
  return getCurrentWeekNumber(seasonToYear(season));
}
