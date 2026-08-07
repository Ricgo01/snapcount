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
  passingFirstDowns: number; sackYardsLost: number;
  carries: number; rushingYards: number; rushingTds: number; rushingFirstDowns: number;
  fumblesLostTotal: number;
  defSacks: number; defInterceptions: number; defTds: number; specialTeamsTds: number;
}

// Columns every row must have — if nflverse renames/drops one of these, we'd
// otherwise silently read `undefined` and every stat built from it would
// read as a real 0 (same failure mode as the jersey-number-0 bug).
// `game_id` only exists on the per-week file — the "reg" (season-summed)
// file has no per-game grain, so it's checked separately, only for 'week'.
const REQUIRED_TEAM_COLS = [
  'team', 'completions', 'attempts', 'passing_yards', 'passing_tds',
  'passing_interceptions', 'passing_first_downs', 'sack_yards_lost',
  'carries', 'rushing_yards', 'rushing_tds', 'rushing_first_downs',
  'fumbles_lost_total', 'def_sacks', 'def_interceptions', 'def_tds', 'special_teams_tds',
];
const REQUIRED_PLAYER_COLS = [
  'game_id', 'team', 'player_name', 'player_display_name',
  'completions', 'attempts', 'passing_yards', 'passing_tds', 'passing_interceptions',
  'carries', 'rushing_yards', 'rushing_tds',
  'receptions', 'targets', 'receiving_yards', 'receiving_tds',
  'def_tackles_solo', 'def_tackles_with_assist', 'def_sacks', 'def_interceptions',
];

function checkColumns(idx: Record<string, number>, required: string[], source: string): void {
  const missing = required.filter(c => !(c in idx));
  if (missing.length) console.warn(`[nflverse] ${source} is missing expected columns:`, missing);
}

function rowToTeamStat(cols: string[], idx: Record<string, number>): TeamStatRow {
  const get = (name: string) => cols[idx[name]];
  return {
    gameId: get('game_id') ?? '',
    team: normalizeAbbr(get('team') ?? ''),
    completions: num(get('completions')), attempts: num(get('attempts')),
    passingYards: num(get('passing_yards')), passingTds: num(get('passing_tds')),
    passingInterceptions: num(get('passing_interceptions')),
    // Negative in the source data — add it (don't subtract) to net out sack yardage.
    passingFirstDowns: num(get('passing_first_downs')), sackYardsLost: num(get('sack_yards_lost')),
    carries: num(get('carries')), rushingYards: num(get('rushing_yards')), rushingTds: num(get('rushing_tds')),
    rushingFirstDowns: num(get('rushing_first_downs')),
    // Already the correct team-level total (covers special-teams/return fumbles
    // too) — don't re-derive by summing sack/rush/receiving fumbles separately.
    fumblesLostTotal: num(get('fumbles_lost_total')),
    defSacks: num(get('def_sacks')), defInterceptions: num(get('def_interceptions')),
    defTds: num(get('def_tds')), specialTeamsTds: num(get('special_teams_tds')),
  };
}

async function fetchTeamStats(year: number, level: 'week' | 'reg'): Promise<TeamStatRow[]> {
  const csv = await fetchCsv(STATS_TEAM_URL(year, level));
  if (!csv) return [];
  const idx: Record<string, number> = {};
  csv.header.forEach((h, i) => { idx[h] = i; });
  checkColumns(idx, REQUIRED_TEAM_COLS, `stats_team_${level}_${year}.csv`);
  if (level === 'week') checkColumns(idx, ['game_id'], `stats_team_${level}_${year}.csv`);

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
    // sackYardsLost is already negative — adding it nets out sack yardage,
    // matching the standard "Total Yards" convention.
    yards: r.passingYards + r.rushingYards + r.sackYardsLost,
    pass:  r.passingYards,
    rush:  r.rushingYards,
    // Doesn't include penalty-induced first downs — nflverse's stats_team
    // files don't break those out separately. Usually a small fraction of
    // the total, so the number stays useful; just not exhaustive.
    first: r.passingFirstDowns + r.rushingFirstDowns,
    poss:  '—',
    turn:  r.passingInterceptions + r.fumblesLostTotal,
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
  checkColumns(idx, REQUIRED_PLAYER_COLS, `stats_player_week_${year}.csv`);

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
