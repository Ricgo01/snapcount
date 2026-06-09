// ESPN hidden API — no key required.
// Base paths differ by endpoint family; both share the same domain.
const BASE    = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl';
const BASE_V2 = 'https://site.api.espn.com/apis/v2/sports/football/nfl';

export const espnUrls = {
  /** Current week scoreboard (no params) or specific week/season */
  scoreboard: (week?: number, season?: number) => {
    const params = new URLSearchParams();
    if (season) params.set('season', String(season));
    if (week)   params.set('week',   String(week));
    const qs = params.toString();
    return `${BASE}/scoreboard${qs ? `?${qs}` : ''}`;
  },

  /** Standings — NOTE: uses /apis/v2/, not /apis/site/v2/ */
  standings: (season?: number) =>
    `${BASE_V2}/standings${season ? `?season=${season}` : ''}`,

  /** Full box score + play-by-play for a single game */
  summary: (eventId: string) => `${BASE}/summary?event=${eventId}`,

  /** All 32 NFL teams */
  teams: () => `${BASE}/teams?limit=32`,

  /** Schedule for one team (seasontype: 1=pre 2=reg 3=post) */
  teamSchedule: (espnTeamId: string, season: number, seasonType = 2) =>
    `${BASE}/teams/${espnTeamId}/schedule?season=${season}&seasontype=${seasonType}`,
} as const;

/** Convert our "2025-26" season string to the ESPN year param (2025) */
export function seasonToYear(season: string): number {
  return parseInt(season.split('-')[0], 10);
}
