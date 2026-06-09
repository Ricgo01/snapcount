import { espnFetch } from '@/lib/espn/client';
import { espnUrls, seasonToYear } from '@/lib/espn/endpoints';
import { espnEventToGame } from '@/lib/espn/transform';
import { gamesByWeek, liveGames, CURRENT_SEASON } from '@/lib/data';
import type { EspnScoreboardResponse } from '@/lib/espn/types';
import type { Game } from '@/types/nfl';

/**
 * Returns games for a given week and season.
 * Falls back to mock data if ESPN is unavailable.
 */
export async function getScoreboard(
  week: number,
  season = CURRENT_SEASON,
): Promise<Game[]> {
  const year = seasonToYear(season);
  const raw = await espnFetch<EspnScoreboardResponse>(
    espnUrls.scoreboard(week, year),
    'espn-scoreboard',
  );

  if (!raw?.events?.length) {
    // Fallback: deterministic mock data
    return gamesByWeek(week).filter(g => g.season === season);
  }

  const games = raw.events
    .map(e => espnEventToGame(e, season))
    .filter((g): g is Game => g !== null);

  return games.length ? games : gamesByWeek(week).filter(g => g.season === season);
}

/**
 * Returns only currently live games.
 * Uses short revalidate (30 s) for active polling.
 */
export async function getLiveGames(season = CURRENT_SEASON): Promise<Game[]> {
  const year = seasonToYear(season);
  const raw = await espnFetch<EspnScoreboardResponse>(
    espnUrls.scoreboard(undefined, year),
    'espn-scoreboard-live',
    30,
  );

  if (!raw?.events?.length) return liveGames();

  return raw.events
    .map(e => espnEventToGame(e, season))
    .filter((g): g is Game => g !== null && g.status === 'live');
}

/**
 * Returns the current week number from ESPN (or mock constant).
 */
export async function getCurrentWeek(season = CURRENT_SEASON): Promise<number> {
  const year = seasonToYear(season);
  const raw = await espnFetch<EspnScoreboardResponse>(
    espnUrls.scoreboard(undefined, year),
    'espn-scoreboard',
  );
  return raw?.week?.number ?? 1;
}
