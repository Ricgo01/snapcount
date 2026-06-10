import { espnFetch } from '@/lib/espn/client';
import { espnUrls, seasonToYear } from '@/lib/espn/endpoints';
import { espnStandingsEntryToRecord, normalizeAbbr } from '@/lib/espn/transform';
import { TEAMS, DIVISIONS } from '@/lib/data';
import type { EspnStandingsResponse } from '@/lib/espn/types';
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
 * Records come from ESPN; teams without data show 0-0 (e.g. a season that
 * hasn't started, or ESPN being down) — never fabricated records.
 */
export async function getStandings(season: string): Promise<StandingsConference[]> {
  const year = seasonToYear(season);
  const raw = await espnFetch<EspnStandingsResponse>(
    espnUrls.standings(year),
    'espn-standings',
  );

  // Build a record map from ESPN data (keys normalized to our team IDs)
  const espnRecords: Record<string, TeamRecord> = {};
  if (raw?.children?.length) {
    for (const conf of raw.children) {
      for (const divGroup of conf.children ?? []) {
        for (const entry of divGroup.standings?.entries ?? []) {
          espnRecords[normalizeAbbr(entry.team.abbreviation)] = espnStandingsEntryToRecord(entry);
        }
      }
    }
  }

  // Build our canonical standings structure using our own team data
  // (we keep our team objects; only records come from ESPN)
  return (['AFC', 'NFC'] as const).map(conf => ({
    conf,
    divisions: DIVISIONS.map(div => {
      const rows: StandingsTeamRow[] = TEAMS
        .filter(t => t.conf === conf && t.div === div)
        .map(t => {
          const record = espnRecords[t.id] ?? ZERO_RECORD;
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
