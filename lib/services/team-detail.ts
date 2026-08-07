import { seasonToYear, CURRENT_ESPN_YEAR } from '@/lib/espn/endpoints';
import { getTeam, CURRENT_SEASON } from '@/lib/data';
import { getStandings } from './standings';
import { getTeamSeason } from './history';
import { fetchTeamSeasonStats } from '@/lib/nflverse/stats';
import type { TeamStatRow } from '@/lib/nflverse/stats';
import type { Team, Game, TeamRecord } from '@/types/nfl';

export interface TeamSeasonStats {
  passYardsPerGame: string;
  rushYardsPerGame: string;
  sacks: string;
  touchdowns: string;
  thirdDown: string;        // not available from nflverse's per-game counting stats
  defInterceptions: string;
}

export interface TeamDetail {
  team: Team;
  record: TeamRecord;
  recordStr: string;
  games: Game[];
  seasonStats: TeamSeasonStats | null;
}

/**
 * Fetch team profile + season games + season stats.
 * Everything comes from the Supabase game history and nflverse's per-season
 * stats files, both kept fresh by the cron — no more "past vs current
 * season" branch, no more ESPN dependency for any of it.
 */
export async function getTeamDetail(abbr: string, season = CURRENT_SEASON): Promise<TeamDetail | null> {
  const team = getTeam(abbr);
  if (!team) return null;

  const year = seasonToYear(season);
  const stored = await getTeamSeason(abbr, year);
  const games: Game[] = stored?.games ?? [];

  // Season stats — hide until games have been played (0-0 before kickoff).
  const gamesPlayed = stored ? stored.record.w + stored.record.l + stored.record.t : 0;
  const seasonStats = year === CURRENT_ESPN_YEAR && gamesPlayed > 0
    ? extractTeamStats(await fetchTeamSeasonStats(year), abbr, gamesPlayed)
    : null;

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

function extractTeamStats(rows: TeamStatRow[], abbr: string, gamesPlayed: number): TeamSeasonStats | null {
  const row = rows.find(r => r.team === abbr);
  if (!row) return null;

  return {
    passYardsPerGame: (row.passingYards / gamesPlayed).toFixed(1),
    rushYardsPerGame: (row.rushingYards / gamesPlayed).toFixed(1),
    sacks:            String(row.defSacks),
    touchdowns:       String(row.passingTdsTotal + row.rushingTdsTotal + row.receivingTdsTotal + row.defTds + row.specialTeamsTds),
    thirdDown:        '—',
    defInterceptions: String(row.defInterceptions),
  };
}
