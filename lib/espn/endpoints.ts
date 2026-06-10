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

  /** Historical scoreboard by date range — use for past seasons */
  scoreboardByDates: (dateRange: string) =>
    `${BASE}/scoreboard?dates=${dateRange}&limit=20`,

  /** Full active roster for a team */
  teamRoster: (espnTeamId: string) =>
    `${BASE}/teams/${espnTeamId}/roster`,

  /** Season-level team statistics */
  teamStats: (espnTeamId: string) =>
    `${BASE}/teams/${espnTeamId}/statistics`,
} as const;

/** Convert our "2025-26" season string to the ESPN year param (2025) */
export function seasonToYear(season: string): number {
  return parseInt(season.split('-')[0], 10);
}

// ── Historical season date helpers ─────────────────────────────────────────
// ESPN's scoreboard `season` param is ignored for historical seasons.
// We must use `dates=YYYYMMDD-YYYYMMDD` to fetch past weeks.
//
// These are the opening kickoff dates (ET) for each NFL season.
// Coverage starts at 2002: first Texans season — all 32 current franchises
// exist, so every game maps onto a canonical team ID.
// Note: 2002-2020 regular seasons were 17 weeks; the week-18 window catches
// wild card weekend, stored with season_type=3 and excluded from records.
const SEASON_OPENS: Record<number, string> = {
  2026: '2026-09-09', // ET date of the kickoff game (NE @ SEA, Wed night)
  2025: '2025-09-04',
  2024: '2024-09-05',
  2023: '2023-09-07',
  2022: '2022-09-08',
  2021: '2021-09-09',
  2020: '2020-09-10',
  2019: '2019-09-05',
  2018: '2018-09-06',
  2017: '2017-09-07',
  2016: '2016-09-08',
  2015: '2015-09-10',
  2014: '2014-09-04',
  2013: '2013-09-05',
  2012: '2012-09-05', // Wednesday opener (DNC conflict)
  2011: '2011-09-08',
  2010: '2010-09-09',
  2009: '2009-09-10',
  2008: '2008-09-04',
  2007: '2007-09-06',
  2006: '2006-09-07',
  2005: '2005-09-08',
  2004: '2004-09-09',
  2003: '2003-09-04',
  2002: '2002-09-05',
};

export const EARLIEST_ESPN_YEAR = 2002;

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10).replace(/-/g, '');
}

/**
 * Returns a `dates=YYYYMMDD-YYYYMMDD` URL fragment covering the full NFL week
 * (Thu kickoff through Monday night game) for a historical season/week pair.
 * Returns null for the current season or unknown season years.
 */
export function weekDateRange(year: number, week: number): string | null {
  const open = SEASON_OPENS[year];
  if (!open) return null;
  const weekOffset = (week - 1) * 7;
  const start = addDays(open, weekOffset);
  const end   = addDays(open, weekOffset + 6);
  return `${start}-${end}`;
}

// ── Playoff date helpers ────────────────────────────────────────────────────
// ESPN also ignores `season` for historical playoff weeks (seasontype=3),
// so past playoffs must be fetched by date range too.
export type PlayoffRound = 'wildCard' | 'divisional' | 'confFinals' | 'superBowl';

/**
 * Date range covering one playoff round of a historical season.
 * Regular season was 17 weeks through 2020, 18 weeks since 2021.
 * The Super Bowl has a bye week before it every year except 2002.
 */
export function playoffDateRange(year: number, round: PlayoffRound): string | null {
  const open = SEASON_OPENS[year];
  if (!open) return null;
  const rsWeeks = year >= 2021 ? 18 : 17;
  const offsets: Record<PlayoffRound, number> = {
    wildCard:   0,
    divisional: 1,
    confFinals: 2,
    superBowl:  year <= 2002 ? 3 : 4,
  };
  const startDay = (rsWeeks + offsets[round]) * 7;
  return `${addDays(open, startDay)}-${addDays(open, startDay + 6)}`;
}

export const CURRENT_ESPN_YEAR = 2026; // Update each new NFL season (+ SEASON_OPENS entry)
