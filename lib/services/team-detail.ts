import { espnFetch } from '@/lib/espn/client';
import { espnUrls, seasonToYear } from '@/lib/espn/endpoints';
import { espnEventToGame } from '@/lib/espn/transform';
import { getTeam, gamesByTeam, RECORDS, recordStr as mockRecordStr, CURRENT_SEASON } from '@/lib/data';
import { getStandings } from './standings';
import type { EspnScoreboardResponse, EspnTeamRef } from '@/lib/espn/types';
import type { Team, Game, TeamRecord } from '@/types/nfl';

export interface TeamDetail {
  team: Team;
  record: TeamRecord;
  recordStr: string;
  games: Game[];
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
 * Uses ESPN schedule endpoint; falls back to mock data on failure.
 */
export async function getTeamDetail(abbr: string, season = CURRENT_SEASON): Promise<TeamDetail | null> {
  const team = getTeam(abbr);
  if (!team) return null;

  const year = seasonToYear(season);
  const espnId = ESPN_TEAM_IDS[abbr];

  // Fetch games from ESPN schedule if we have an ESPN ID
  let games: Game[] = [];
  if (espnId) {
    const raw = await espnFetch<{ events?: EspnScoreboardResponse['events'] }>(
      espnUrls.teamSchedule(espnId, year),
      `espn-team-${abbr}`,
    );
    if (raw?.events?.length) {
      games = raw.events
        .map(e => espnEventToGame(e, season))
        .filter((g): g is Game => g !== null);
    }
  }

  // Fallback to mock games
  if (!games.length) {
    games = gamesByTeam(abbr).filter(g => g.season === season);
  }

  // Get record from standings service (which itself falls back to mock)
  const standings = await getStandings(season);
  const confData = standings.find(s => s.conf === team.conf);
  const divData  = confData?.divisions.find(d => d.div === team.div);
  const teamRow  = divData?.teams.find(t => t.id === abbr);

  const record    = teamRow?.record    ?? RECORDS[abbr];
  const recString = teamRow?.recordStr ?? mockRecordStr(abbr);

  return { team, record, recordStr: recString, games };
}
