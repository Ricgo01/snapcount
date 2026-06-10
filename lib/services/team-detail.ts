import { espnFetch } from '@/lib/espn/client';
import { espnUrls, seasonToYear, CURRENT_ESPN_YEAR } from '@/lib/espn/endpoints';
import { espnEventToGame } from '@/lib/espn/transform';
import { getTeam, CURRENT_SEASON } from '@/lib/data';
import { getStandings } from './standings';
import { getTeamSeason } from './history';
import type { EspnScoreboardResponse, EspnTeamStatsResponse } from '@/lib/espn/types';
import type { Team, Game, TeamRecord } from '@/types/nfl';

export interface TeamSeasonStats {
  passYardsPerGame: string;
  rushYardsPerGame: string;
  sacks: string;
  touchdowns: string;
  thirdDown: string;        // e.g. "90/224"
  defInterceptions: string;
}

export interface TeamDetail {
  team: Team;
  record: TeamRecord;
  recordStr: string;
  games: Game[];
  seasonStats: TeamSeasonStats | null;
}

/** ESPN team abbreviation → ESPN numeric team ID (needed for schedule endpoint) */
const ESPN_TEAM_IDS: Record<string, string> = {
  BUF: '2',  MIA: '15', NE: '17',  NYJ: '20',
  BAL: '33', CIN: '4',  CLE: '5',  PIT: '23',
  HOU: '34', IND: '11', JAX: '30', TEN: '10',
  DEN: '7',  KC: '12',  LV: '13',  LAC: '24',
  DAL: '6',  NYG: '19', PHI: '21', WAS: '28',
  CHI: '3',  DET: '8',  GB: '9',   MIN: '16',
  ATL: '1',  CAR: '29', NO: '18',  TB: '27',
  ARI: '22', LAR: '14', SF: '25',  SEA: '26',
};

/**
 * Fetch team profile + season games.
 * Past seasons come from the Supabase game history (exact results + record);
 * the current season uses ESPN live data. Falls back to mock data on failure.
 */
export async function getTeamDetail(abbr: string, season = CURRENT_SEASON): Promise<TeamDetail | null> {
  const team = getTeam(abbr);
  if (!team) return null;

  const year = seasonToYear(season);
  const espnId = ESPN_TEAM_IDS[abbr];

  // The record always comes from stored history: exact for past seasons and
  // cron-updated for the current one (0-0 before kickoff — ESPN's standings
  // serve the previous season during the offseason, which reads as stale).
  const stored = await getTeamSeason(abbr, year);

  if (year !== CURRENT_ESPN_YEAR && stored) {
    const r = stored.record;
    const recString = r.t ? `${r.w}-${r.l}-${r.t}` : `${r.w}-${r.l}`;
    return { team, record: r, recordStr: recString, games: stored.games, seasonStats: null };
  }

  // Parallel fetch: schedule + season stats (stats endpoint is current-season only)
  const [scheduleRaw, statsRaw] = await Promise.all([
    espnId
      ? espnFetch<{ events?: EspnScoreboardResponse['events'] }>(
          espnUrls.teamSchedule(espnId, year),
          `espn-team-${abbr}`,
        )
      : Promise.resolve(null),
    espnId && year === CURRENT_ESPN_YEAR
      ? espnFetch<EspnTeamStatsResponse>(
          espnUrls.teamStats(espnId),
          `espn-team-stats-${abbr}`,
          3600,
        )
      : Promise.resolve(null),
  ]);

  // Games
  let games: Game[] = [];
  if (scheduleRaw?.events?.length) {
    games = scheduleRaw.events
      .map(e => espnEventToGame(e, season))
      .filter((g): g is Game => g !== null);
  }
  if (!games.length) {
    games = stored?.games ?? [];
  }

  // Season stats — hide until games have been played: during the offseason
  // ESPN's stats endpoint still serves the *previous* season's numbers
  const hasPlayed = !stored || stored.record.w + stored.record.l + stored.record.t > 0;
  const seasonStats = hasPlayed ? extractTeamStats(statsRaw) : null;

  // Record: stored games first (kept fresh by the cron); standings as fallback
  let record    = stored?.record;
  let recString = record ? (record.t ? `${record.w}-${record.l}-${record.t}` : `${record.w}-${record.l}`) : undefined;

  if (!record) {
    const standings = await getStandings(season);
    const confData  = standings.find(s => s.conf === team.conf);
    const divData   = confData?.divisions.find(d => d.div === team.div);
    const teamRow   = divData?.teams.find(t => t.id === abbr);
    record    = teamRow?.record    ?? { w: 0, l: 0, t: 0, pf: 0, pa: 0 };
    recString = teamRow?.recordStr ?? '0-0';
  }

  return { team, record, recordStr: recString!, games, seasonStats };
}

function extractTeamStats(raw: EspnTeamStatsResponse | null): TeamSeasonStats | null {
  const cats = raw?.results?.stats?.categories;
  if (!cats?.length) return null;

  const getCat  = (name: string) => cats.find(c => c.name === name);
  const getStat = (cat: ReturnType<typeof getCat>, stat: string) =>
    cat?.stats?.find(s => s.name === stat);

  const passing  = getCat('passing');
  const rushing  = getCat('rushing');
  const defense  = getCat('defensive');
  const defInt   = getCat('defensiveInterceptions');
  const misc     = getCat('miscellaneous');
  const scoring  = getCat('scoring');

  return {
    passYardsPerGame: getStat(passing, 'netPassingYards')?.perGameDisplayValue ?? '—',
    rushYardsPerGame: getStat(rushing, 'rushingYards')?.perGameDisplayValue ?? '—',
    sacks:            getStat(defense, 'sacks')?.displayValue ?? '—',
    touchdowns:       getStat(scoring, 'totalTouchdowns')?.displayValue ?? '—',
    thirdDown: (() => {
      const convs = getStat(misc, 'thirdDownConvs')?.displayValue ?? '—';
      const atts  = getStat(misc, 'thirdDownAttempts')?.displayValue ?? '—';
      return `${convs}/${atts}`;
    })(),
    defInterceptions: getStat(defInt, 'interceptions')?.displayValue ?? '—',
  };
}
