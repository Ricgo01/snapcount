import { espnFetch } from '@/lib/espn/client';
import { espnUrls, seasonToYear, weekDateRange, CURRENT_ESPN_YEAR } from '@/lib/espn/endpoints';
import { espnEventToGame } from '@/lib/espn/transform';
import { CURRENT_SEASON } from '@/lib/data';
import type { EspnScoreboardResponse } from '@/lib/espn/types';
import type { Game } from '@/types/nfl';

/**
 * Returns games for a given week and season — always via scoreboard?dates=.
 * ESPN's `season`/`week` params are unreliable: they serve the most recently
 * *played* season, so an upcoming season's schedule never shows through them.
 * Date ranges work for past, current and future weeks alike.
 * Returns [] when ESPN is unavailable — callers show an empty state.
 */
export async function getScoreboard(
  week: number,
  season = CURRENT_SEASON,
): Promise<Game[]> {
  const year = seasonToYear(season);

  const range = weekDateRange(year, week);
  if (!range) return [];
  const url = espnUrls.scoreboardByDates(range);
  const tag = `espn-scoreboard-${year}-w${week}`;

  // Current season refreshes fast (live scores); historical is immutable
  const raw = await espnFetch<EspnScoreboardResponse>(
    url, tag, year === CURRENT_ESPN_YEAR ? 300 : 3600,
  );

  return (raw?.events ?? [])
    .map(e => espnEventToGame(e, season))
    .filter((g): g is Game => g !== null);
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

/**
 * Returns the current (or last) week number for a season.
 * For past seasons, returns 18 (full regular season completed).
 */
export async function getCurrentWeek(season = CURRENT_SEASON): Promise<number> {
  const year = seasonToYear(season);
  if (year !== CURRENT_ESPN_YEAR) return 18; // past seasons: all 18 weeks available

  const raw = await espnFetch<EspnScoreboardResponse>(
    espnUrls.scoreboard(),
    `espn-scoreboard-current`,
  );
  return raw?.week?.number ?? 1;
}
