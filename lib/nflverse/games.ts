import { parseCsvLine } from './csv';
import { normalizeAbbr } from '@/lib/espn/transform';
import type { GameRow } from '@/lib/services/history';
import type { GameDay } from '@/types/nfl';

/**
 * Full NFL schedule/results history (1999-present), including future games
 * already on the calendar (null scores). One file, no key, no quota.
 * Source: nflverse-data (github.com/nflverse/nflverse-data), maintained from
 * Lee Sharpe's nfldata project.
 */
const GAMES_CSV_URL =
  'https://github.com/nflverse/nflverse-data/releases/download/schedules/games.csv';

/** nflverse `game_type` → our season_type (1=pre 2=reg 3=post), same convention ESPN used. */
const GAME_TYPE_TO_SEASON_TYPE: Record<string, number> = {
  PRE: 1,
  REG: 2,
  WC:  3,
  DIV: 3,
  CON: 3,
  SB:  3,
};

/** nflverse `weekday` (English) → our GameDay (Spanish abbreviation). */
const WEEKDAY_TO_GAME_DAY: Record<string, GameDay> = {
  Sunday:    'Dom',
  Monday:    'Lun',
  Tuesday:   'Mar',
  Wednesday: 'Mié',
  Thursday:  'Jue',
  Friday:    'Vie',
  Saturday:  'Sáb',
};

function rowToGameRow(cols: string[], idx: Record<string, number>): GameRow | null {
  const get = (name: string) => cols[idx[name]] ?? '';

  // The `espn` column is ESPN's own event ID for this game — reusing it keeps
  // our Supabase `games.id` scheme (and every /game/[id] URL) unchanged.
  const id = get('espn');
  if (!id) return null;

  const seasonType = GAME_TYPE_TO_SEASON_TYPE[get('game_type')];
  if (!seasonType) return null; // unrecognized game_type — skip defensively

  const season = Number(get('season'));
  const week = Number(get('week'));
  if (!Number.isFinite(season) || !Number.isFinite(week)) return null;

  const homeScoreRaw = get('home_score');
  const awayScoreRaw = get('away_score');
  const homeScore = homeScoreRaw !== '' ? Number(homeScoreRaw) : null;
  const awayScore = awayScoreRaw !== '' ? Number(awayScoreRaw) : null;

  const gameday = get('gameday');
  const gametime = get('gametime');
  const weekday = get('weekday');
  const day = WEEKDAY_TO_GAME_DAY[weekday];
  if (!day) console.warn(`[nflverse] unrecognized weekday "${weekday}" for game ${id}, defaulting to Dom`);

  return {
    id,
    nflverse_game_id: get('game_id') || null,
    season,
    week,
    season_type: seasonType,
    game_date:   gameday ? `${gameday}T${gametime || '00:00'}:00` : null,
    day:         day ?? 'Dom',
    time:        gametime,
    home_team:   normalizeAbbr(get('home_team')),
    away_team:   normalizeAbbr(get('away_team')),
    home_score:  homeScore,
    away_score:  awayScore,
    // nflverse has no live/in-progress state — only ever scheduled or final.
    status:      homeScore !== null && awayScore !== null ? 'final' : 'scheduled',
    stadium:     get('stadium') || null,
    updated_at:  new Date().toISOString(),
  };
}

/**
 * Downloads and parses the full nflverse schedule/results file.
 * Returns [] on any network/parse error — callers keep whatever they had.
 */
export async function fetchAllGames(): Promise<GameRow[]> {
  let text: string;
  try {
    const res = await fetch(GAMES_CSV_URL, {
      cache: 'no-store',
      signal: AbortSignal.timeout(60_000),
    });
    if (!res.ok) {
      console.warn(`[nflverse] games.csv ${res.status}`);
      return [];
    }
    text = await res.text();
  } catch (err) {
    console.warn('[nflverse] games.csv fetch error:', err);
    return [];
  }

  const lines = text.split('\n');
  if (!lines.length) return [];
  const header = parseCsvLine(lines[0].trim());
  const idx: Record<string, number> = {};
  header.forEach((h, i) => { idx[h] = i; });

  const rows: GameRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line || line.length < 5) continue;
    const row = rowToGameRow(parseCsvLine(line.trim()), idx);
    if (row) rows.push(row);
  }
  return rows;
}
