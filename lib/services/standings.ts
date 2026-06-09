import { espnFetch } from '@/lib/espn/client';
import { espnUrls, seasonToYear } from '@/lib/espn/endpoints';
import { espnStandingsEntryToRecord } from '@/lib/espn/transform';
import { TEAMS, recordStr as mockRecordStr, RECORDS, teamsByConfDiv, DIVISIONS } from '@/lib/data';
import type { EspnStandingsResponse, EspnStandingsEntry } from '@/lib/espn/types';
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

/** ESPN conference name → our abbreviation */
const CONF_MAP: Record<string, string> = {
  'American Football Conference': 'AFC',
  'National Football Conference': 'NFC',
  'AFC': 'AFC',
  'NFC': 'NFC',
};

/** ESPN division name → our division label ("AFC East" → "East") */
function parseDivision(name: string): string {
  const parts = name.split(' ');
  return parts[parts.length - 1] ?? name; // last word: "East", "West", etc.
}

/**
 * Returns standings grouped by conference → division.
 * Falls back to mock records if ESPN is unavailable.
 */
export async function getStandings(season: string): Promise<StandingsConference[]> {
  const year = seasonToYear(season);
  const raw = await espnFetch<EspnStandingsResponse>(
    espnUrls.standings(year),
    'espn-standings',
  );

  // Build a record map from ESPN data
  const espnRecords: Record<string, TeamRecord> = {};
  if (raw?.children?.length) {
    for (const conf of raw.children) {
      for (const divGroup of conf.children ?? []) {
        for (const entry of divGroup.standings?.entries ?? []) {
          const abbr = entry.team.abbreviation;
          espnRecords[abbr] = espnStandingsEntryToRecord(entry);
        }
      }
    }
  }

  const useEspn = Object.keys(espnRecords).length > 0;

  // Build our canonical standings structure using our own team data
  // (we keep our team objects; only records come from ESPN)
  return (['AFC', 'NFC'] as const).map(conf => ({
    conf,
    divisions: DIVISIONS.map(div => {
      const teams = teamsByConfDiv(conf, div);
      const rows: StandingsTeamRow[] = teams
        .map(t => {
          const record = useEspn
            ? (espnRecords[t.id] ?? RECORDS[t.id])
            : RECORDS[t.id];
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
