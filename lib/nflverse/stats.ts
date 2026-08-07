import { parseCsvLine } from './csv';
import { normalizeAbbr } from '@/lib/espn/transform';
import type { GameStatsResult, PlayerStatCategory, PlayerStatsTeam, TeamStats } from '@/types/nfl';

/**
 * Per-game and per-season team/player stats — nflverse's `stats_team`/
 * `stats_player` releases (one file per season, updated during the season).
 * These are counting stats (yards, TDs, turnovers by category) — they do
 * NOT include time-of-possession or 3rd-down efficiency, which only exist
 * in raw play-by-play. Those two fields render as '—', never fabricated.
 */

const STATS_TEAM_URL  = (year: number, level: 'week' | 'reg') =>
  `https://github.com/nflverse/nflverse-data/releases/download/stats_team/stats_team_${level}_${year}.csv`;
const STATS_PLAYER_URL = (year: number) =>
  `https://github.com/nflverse/nflverse-data/releases/download/stats_player/stats_player_week_${year}.csv`;

async function fetchCsv(url: string): Promise<{ header: string[]; lines: string[] } | null> {
  try {
    const res = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(30_000) });
    if (!res.ok) {
      console.warn(`[nflverse] ${res.status} for ${url}`);
      return null;
    }
    const text = await res.text();
    const lines = text.split('\n');
    if (!lines.length) return null;
    return { header: parseCsvLine(lines[0].trim()), lines };
  } catch (err) {
    console.warn(`[nflverse] fetch error for ${url}:`, err);
    return null;
  }
}

function num(v: string | undefined): number {
  const n = Number(v);
  return v && Number.isFinite(n) ? n : 0;
}

// ── Team stats (per week or per regular season, same column set) ───────────

export interface TeamStatRow {
  gameId: string;
  team: string;
  completions: number; attempts: number; passingYards: number; passingTds: number; passingInterceptions: number;
  passingFirstDowns: number; sackFumblesLost: number;
  carries: number; rushingYards: number; rushingTds: number; rushingFirstDowns: number; rushingFumblesLost: number;
  receivingFumblesLost: number;
  passingTdsTotal: number; rushingTdsTotal: number; receivingTdsTotal: number;
  defSacks: number; defInterceptions: number; defTds: number; specialTeamsTds: number;
}

function rowToTeamStat(cols: string[], idx: Record<string, number>): TeamStatRow {
  const get = (name: string) => cols[idx[name]];
  return {
    gameId: get('game_id') ?? '',
    team: normalizeAbbr(get('team') ?? ''),
    completions: num(get('completions')), attempts: num(get('attempts')),
    passingYards: num(get('passing_yards')), passingTds: num(get('passing_tds')),
    passingInterceptions: num(get('passing_interceptions')),
    passingFirstDowns: num(get('passing_first_downs')), sackFumblesLost: num(get('sack_fumbles_lost')),
    carries: num(get('carries')), rushingYards: num(get('rushing_yards')), rushingTds: num(get('rushing_tds')),
    rushingFirstDowns: num(get('rushing_first_downs')), rushingFumblesLost: num(get('rushing_fumbles_lost')),
    receivingFumblesLost: num(get('receiving_fumbles_lost')),
    passingTdsTotal: num(get('passing_tds')), rushingTdsTotal: num(get('rushing_tds')),
    receivingTdsTotal: num(get('receiving_tds')),
    defSacks: num(get('def_sacks')), defInterceptions: num(get('def_interceptions')),
    defTds: num(get('def_tds')), specialTeamsTds: num(get('special_teams_tds')),
  };
}

async function fetchTeamStats(year: number, level: 'week' | 'reg'): Promise<TeamStatRow[]> {
  const csv = await fetchCsv(STATS_TEAM_URL(year, level));
  if (!csv) return [];
  const idx: Record<string, number> = {};
  csv.header.forEach((h, i) => { idx[h] = i; });

  const rows: TeamStatRow[] = [];
  for (let i = 1; i < csv.lines.length; i++) {
    const line = csv.lines[i];
    if (!line || line.length < 5) continue;
    rows.push(rowToTeamStat(parseCsvLine(line.trim()), idx));
  }
  return rows;
}

/** One row per team per week for a season — used for per-game box scores. */
export function fetchTeamWeekStats(year: number): Promise<TeamStatRow[]> {
  return fetchTeamStats(year, 'week');
}

/** One row per team, already summed across the regular season. */
export function fetchTeamSeasonStats(year: number): Promise<TeamStatRow[]> {
  return fetchTeamStats(year, 'reg');
}

/** Team box score for one game from its home/away week-stat rows. */
export function toGameStatsResult(home: TeamStatRow, away: TeamStatRow): GameStatsResult {
  const toStats = (r: TeamStatRow): TeamStats => ({
    yards: r.passingYards + r.rushingYards,
    pass:  r.passingYards,
    rush:  r.rushingYards,
    first: r.passingFirstDowns + r.rushingFirstDowns,
    poss:  '—',
    turn:  r.passingInterceptions + r.sackFumblesLost + r.rushingFumblesLost + r.receivingFumblesLost,
    third: '—',
  });
  return { home: toStats(home), away: toStats(away) };
}

// ── Player stats (per week) ─────────────────────────────────────────────────

interface PlayerStatRow {
  gameId: string; team: string; name: string;
  completions: number; attempts: number; passingYards: number; passingTds: number; passingInterceptions: number;
  carries: number; rushingYards: number; rushingTds: number;
  receptions: number; targets: number; receivingYards: number; receivingTds: number;
  defTacklesSolo: number; defTacklesAssist: number; defSacks: number; defInterceptions: number;
}

function rowToPlayerStat(cols: string[], idx: Record<string, number>): PlayerStatRow {
  const get = (name: string) => cols[idx[name]];
  return {
    gameId: get('game_id') ?? '',
    team: normalizeAbbr(get('team') ?? ''),
    name: get('player_name') || get('player_display_name') || '',
    completions: num(get('completions')), attempts: num(get('attempts')),
    passingYards: num(get('passing_yards')), passingTds: num(get('passing_tds')),
    passingInterceptions: num(get('passing_interceptions')),
    carries: num(get('carries')), rushingYards: num(get('rushing_yards')), rushingTds: num(get('rushing_tds')),
    receptions: num(get('receptions')), targets: num(get('targets')),
    receivingYards: num(get('receiving_yards')), receivingTds: num(get('receiving_tds')),
    defTacklesSolo: num(get('def_tackles_solo')), defTacklesAssist: num(get('def_tackles_with_assist')),
    defSacks: num(get('def_sacks')), defInterceptions: num(get('def_interceptions')),
  };
}

export async function fetchPlayerWeekStats(year: number): Promise<PlayerStatRow[]> {
  const csv = await fetchCsv(STATS_PLAYER_URL(year));
  if (!csv) return [];
  const idx: Record<string, number> = {};
  csv.header.forEach((h, i) => { idx[h] = i; });

  const rows: PlayerStatRow[] = [];
  for (let i = 1; i < csv.lines.length; i++) {
    const line = csv.lines[i];
    if (!line || line.length < 5) continue;
    rows.push(rowToPlayerStat(parseCsvLine(line.trim()), idx));
  }
  return rows;
}

function sumCol(rows: PlayerStatRow[], pick: (r: PlayerStatRow) => number): number {
  return rows.reduce((acc, r) => acc + pick(r), 0);
}

/** Builds the categorized player-stats block for one team in one game. */
export function toPlayerStatsTeam(rows: PlayerStatRow[]): PlayerStatsTeam {
  const categories: PlayerStatCategory[] = [];

  const passers = rows.filter(r => r.attempts > 0);
  if (passers.length) {
    categories.push({
      name: 'passing',
      labels: ['C/ATT', 'YDS', 'TD', 'INT'],
      rows: passers.map(r => ({
        name: r.name,
        vals: [`${r.completions}/${r.attempts}`, String(r.passingYards), String(r.passingTds), String(r.passingInterceptions)],
      })),
      totals: [
        `${sumCol(passers, r => r.completions)}/${sumCol(passers, r => r.attempts)}`,
        String(sumCol(passers, r => r.passingYards)),
        String(sumCol(passers, r => r.passingTds)),
        String(sumCol(passers, r => r.passingInterceptions)),
      ],
    });
  }

  const rushers = rows.filter(r => r.carries > 0);
  if (rushers.length) {
    categories.push({
      name: 'rushing',
      labels: ['CAR', 'YDS', 'TD'],
      rows: rushers.map(r => ({ name: r.name, vals: [String(r.carries), String(r.rushingYards), String(r.rushingTds)] })),
      totals: [
        String(sumCol(rushers, r => r.carries)),
        String(sumCol(rushers, r => r.rushingYards)),
        String(sumCol(rushers, r => r.rushingTds)),
      ],
    });
  }

  const receivers = rows.filter(r => r.targets > 0 || r.receptions > 0);
  if (receivers.length) {
    categories.push({
      name: 'receiving',
      labels: ['REC', 'YDS', 'TD'],
      rows: receivers.map(r => ({ name: r.name, vals: [String(r.receptions), String(r.receivingYards), String(r.receivingTds)] })),
      totals: [
        String(sumCol(receivers, r => r.receptions)),
        String(sumCol(receivers, r => r.receivingYards)),
        String(sumCol(receivers, r => r.receivingTds)),
      ],
    });
  }

  const defenders = rows.filter(r => r.defTacklesSolo + r.defTacklesAssist + r.defSacks + r.defInterceptions > 0);
  if (defenders.length) {
    categories.push({
      name: 'defensive',
      labels: ['TCK', 'SACK', 'INT'],
      rows: defenders.map(r => ({
        name: r.name,
        vals: [String(r.defTacklesSolo + r.defTacklesAssist), String(r.defSacks), String(r.defInterceptions)],
      })),
      totals: [
        String(sumCol(defenders, r => r.defTacklesSolo + r.defTacklesAssist)),
        String(sumCol(defenders, r => r.defSacks)),
        String(sumCol(defenders, r => r.defInterceptions)),
      ],
    });
  }

  return { categories };
}
