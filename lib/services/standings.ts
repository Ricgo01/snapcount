import { seasonToYear } from '@/lib/espn/endpoints';
import { getSeasonRecords } from './history';
import { TEAMS, DIVISIONS } from '@/lib/data';
import type { Team, TeamRecord } from '@/types/nfl';

export interface StandingsTeamRow extends Team {
  record: TeamRecord;
  recordStr: string;
}

export interface StandingsDivision {
  div: string;
  teams: StandingsTeamRow[];
}

export interface StandingsConference {
  conf: string;
  divisions: StandingsDivision[];
}

const ZERO_RECORD: TeamRecord = { w: 0, l: 0, t: 0, pf: 0, pa: 0 };

/**
 * Returns standings grouped by conference → division.
 * Records are aggregated from our own stored games (kept fresh by the
 * nflverse-backed cron); teams without a final game yet show 0-0 — never
 * fabricated records.
 */
export async function getStandings(season: string): Promise<StandingsConference[]> {
  const year = seasonToYear(season);
  const records = await getSeasonRecords(year);

  return (['AFC', 'NFC'] as const).map(conf => ({
    conf,
    divisions: DIVISIONS.map(div => {
      const rows: StandingsTeamRow[] = TEAMS
        .filter(t => t.conf === conf && t.div === div)
        .map(t => {
          const record = records.get(t.id) ?? ZERO_RECORD;
          return {
            ...t,
            record,
            recordStr: record.t
              ? `${record.w}-${record.l}-${record.t}`
              : `${record.w}-${record.l}`,
          };
        })
        .sort((a, b) => b.record.w - a.record.w || a.record.l - b.record.l);
      return { div, teams: rows };
    }),
  }));
}
