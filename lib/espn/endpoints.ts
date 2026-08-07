// ESPN hidden API — no key required.
const BASE = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl';

export const espnUrls = {
  /** Current week scoreboard (no params) or specific week/season */
  scoreboard: (week?: number, season?: number) => {
    const params = new URLSearchParams();
    if (season) params.set('season', String(season));
    if (week)   params.set('week',   String(week));
    const qs = params.toString();
    return `${BASE}/scoreboard${qs ? `?${qs}` : ''}`;
  },

  /** Full box score + play-by-play for a single game */
  summary: (eventId: string) => `${BASE}/summary?event=${eventId}`,

  /** Historical scoreboard by date range — use for past seasons */
  scoreboardByDates: (dateRange: string) =>
    `${BASE}/scoreboard?dates=${dateRange}&limit=20`,

  /** Full active roster for a team */
  teamRoster: (espnTeamId: string) =>
    `${BASE}/teams/${espnTeamId}/roster`,
} as const;

/** Convert our "2025-26" season string to the ESPN year param (2025) */
export function seasonToYear(season: string): number {
  return parseInt(season.split('-')[0], 10);
}

export const EARLIEST_ESPN_YEAR = 2002;
export const CURRENT_ESPN_YEAR = 2026; // Update each new NFL season
