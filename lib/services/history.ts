import { CURRENT_ESPN_YEAR } from '@/lib/espn/endpoints';
import { fetchAllGames } from '@/lib/nflverse/games';
import { supabaseRead, supabaseAdmin } from '@/lib/supabase/server';
import type { Game, GameDay, GameStatus, TeamRecord } from '@/types/nfl';

/**
 * Game history backed by Supabase (table: public.games).
 *
 * Write path (admin client, secret key):
 *   - syncScoreboard()  — upserts the current season from nflverse; called by /api/refresh.
 *   - backfillSeason()  — loads a full season in one shot; called by /api/backfill.
 *
 * Read path (publishable key, public RLS select):
 *   - getTeamSeason()    — one team's regular season with computed W-L-T record.
 *   - getHeadToHead()    — previous meetings between two teams.
 *   - getSeasonRecords() — every team's W-L-T record for a season (standings).
 */

// ── Row mapping ──────────────────────────────────────────────────────────────

export interface GameRow {
  id: string;
  season: number;
  week: number;
  season_type: number;
  game_date: string | null;
  day: string;
  time: string;
  home_team: string;
  away_team: string;
  home_score: number | null;
  away_score: number | null;
  status: string;
  stadium: string | null;
  updated_at?: string;
}

/** 2025 → "2025-26" (our season string format) */
function yearToSeason(year: number): string {
  return `${year}-${String((year + 1) % 100).padStart(2, '0')}`;
}

function rowToGame(row: GameRow): Game {
  return {
    id:        row.id,
    espnId:    row.id,
    week:      row.week,
    date:      row.game_date ?? undefined,
    day:       row.day as GameDay,
    time:      row.time,
    season:    yearToSeason(row.season),
    homeId:    row.home_team,
    awayId:    row.away_team,
    stadium:   row.stadium ?? 'TBD',
    status:    row.status as GameStatus,
    homeScore: row.home_score,
    awayScore: row.away_score,
    quarter:   null,
    clock:     null,
  };
}

// ── Write path ───────────────────────────────────────────────────────────────

async function upsertRows(rows: GameRow[]): Promise<{ count: number; failed: boolean }> {
  const db = supabaseAdmin();
  if (!db || !rows.length) return { count: 0, failed: false };

  const { error } = await db.from('games').upsert(rows, { onConflict: 'id' });
  if (error) {
    console.error('[history] upsert failed:', error.message);
    return { count: 0, failed: true };
  }
  return { count: rows.length, failed: false };
}

/**
 * Upserts the current season's full schedule from nflverse.
 * Cheap (one file fetch) — safe to run on every /api/refresh tick.
 * Also returns the IDs of finished games so the caller can sync their stats.
 * `failed` reflects a real Supabase write error (not "nothing to sync yet"),
 * so /api/refresh can tell the two apart.
 */
export async function syncScoreboard(): Promise<{ synced: number; finalIds: string[]; failed: boolean }> {
  const all = await fetchAllGames();
  const rows = all.filter(r => r.season === CURRENT_ESPN_YEAR);
  if (!rows.length) return { synced: 0, finalIds: [], failed: false };

  const { count: synced, failed } = await upsertRows(rows);
  const finalIds = rows.filter(r => r.status === 'final').map(r => r.id);
  return { synced, finalIds, failed };
}

/**
 * Loads a full season into Supabase in one shot. Run once per season via
 * /api/backfill.
 */
export async function backfillSeason(
  year: number,
): Promise<{ year: number; weeks: number; games: number }> {
  const all = await fetchAllGames();
  const rows = all.filter(r => r.season === year);
  if (!rows.length) return { year, weeks: 0, games: 0 };

  const { count: games } = await upsertRows(rows);
  const weeks = new Set(rows.map(r => r.week)).size;
  return { year, weeks, games };
}

// ── Read path ────────────────────────────────────────────────────────────────

/** One stored game by ESPN event ID (null when not stored / Supabase down). */
export async function getStoredGame(id: string): Promise<Game | null> {
  const db = supabaseRead();
  if (!db) return null;

  const { data, error } = await db.from('games').select('*').eq('id', id).maybeSingle();
  if (error) {
    console.warn('[history] getStoredGame failed:', error.message);
    return null;
  }
  return data ? rowToGame(data as GameRow) : null;
}

export interface TeamSeasonData {
  games: Game[];       // regular-season games, ordered by week
  record: TeamRecord;  // computed from final games
}

/**
 * One team's regular season from Supabase: games + computed W-L-T record.
 * Returns null when the season isn't stored (or Supabase is unavailable),
 * so callers can fall back to ESPN/mock.
 */
export async function getTeamSeason(abbr: string, year: number): Promise<TeamSeasonData | null> {
  if (!/^[A-Z]{2,3}$/.test(abbr)) return null;

  const db = supabaseRead();
  if (!db) return null;

  const { data, error } = await db
    .from('games')
    .select('*')
    .or(`home_team.eq.${abbr},away_team.eq.${abbr}`)
    .eq('season', year)
    .eq('season_type', 2)
    .order('week', { ascending: true });

  if (error) {
    console.warn('[history] getTeamSeason failed:', error.message);
    return null;
  }
  const rows = (data ?? []) as GameRow[];
  if (!rows.length) return null;

  const record: TeamRecord = { w: 0, l: 0, t: 0, pf: 0, pa: 0 };
  for (const r of rows) {
    if (r.status !== 'final' || r.home_score === null || r.away_score === null) continue;
    const isHome = r.home_team === abbr;
    const us     = isHome ? r.home_score : r.away_score;
    const them   = isHome ? r.away_score : r.home_score;
    record.pf += us;
    record.pa += them;
    if (us > them) record.w++;
    else if (us < them) record.l++;
    else record.t++;
  }

  return { games: rows.map(rowToGame), record };
}

/** All regular-season games for one week, ordered by kickoff. */
export async function getWeekGames(year: number, week: number): Promise<Game[]> {
  const db = supabaseRead();
  if (!db) return [];

  const { data, error } = await db
    .from('games')
    .select('*')
    .eq('season', year)
    .eq('week', week)
    .eq('season_type', 2)
    .order('game_date', { ascending: true });

  if (error) {
    console.warn('[history] getWeekGames failed:', error.message);
    return [];
  }
  return ((data ?? []) as GameRow[]).map(rowToGame);
}

/**
 * Current (or last) regular-season week for a season: the latest week whose
 * earliest game has already kicked off, or week 1 if the season hasn't
 * started (or isn't stored yet).
 */
export async function getCurrentWeekNumber(year: number): Promise<number> {
  const db = supabaseRead();
  if (!db) return 1;

  const { data, error } = await db
    .from('games')
    .select('week, game_date')
    .eq('season', year)
    .eq('season_type', 2);

  if (error || !data?.length) return 1;

  const weekStart = new Map<number, number>();
  for (const r of data as { week: number; game_date: string | null }[]) {
    if (!r.game_date) continue;
    const t = new Date(r.game_date).getTime();
    const prev = weekStart.get(r.week);
    if (prev === undefined || t < prev) weekStart.set(r.week, t);
  }
  const weeks = [...weekStart.keys()].sort((a, b) => a - b);
  if (!weeks.length) return 1;

  const now = Date.now();
  let current = weeks[0];
  for (const w of weeks) {
    if (weekStart.get(w)! <= now) current = w;
    else break;
  }
  return current;
}

/** Previous meetings between two teams (newest first, finals only). */
export async function getHeadToHead(
  teamA: string,
  teamB: string,
  limit = 10,
): Promise<Game[]> {
  if (!/^[A-Z]{2,3}$/.test(teamA) || !/^[A-Z]{2,3}$/.test(teamB)) return [];

  const db = supabaseRead();
  if (!db) return [];

  const { data, error } = await db
    .from('games')
    .select('*')
    .or(
      `and(home_team.eq.${teamA},away_team.eq.${teamB}),` +
      `and(home_team.eq.${teamB},away_team.eq.${teamA})`,
    )
    .eq('status', 'final')
    .order('season', { ascending: false })
    .order('week', { ascending: false })
    .limit(limit);

  if (error) {
    console.warn('[history] getHeadToHead failed:', error.message);
    return [];
  }
  return ((data ?? []) as GameRow[]).map(rowToGame);
}

/**
 * Every team's regular-season W-L-T-PF-PA for a season, in one query —
 * backs standings without a per-team round trip. Teams with no final games
 * yet simply don't appear in the map; callers default them to 0-0.
 */
export async function getSeasonRecords(year: number): Promise<Map<string, TeamRecord>> {
  const records = new Map<string, TeamRecord>();

  const db = supabaseRead();
  if (!db) return records;

  const { data, error } = await db
    .from('games')
    .select('*')
    .eq('season', year)
    .eq('season_type', 2)
    .eq('status', 'final');

  if (error) {
    console.warn('[history] getSeasonRecords failed:', error.message);
    return records;
  }

  const bump = (abbr: string, us: number, them: number) => {
    const r = records.get(abbr) ?? { w: 0, l: 0, t: 0, pf: 0, pa: 0 };
    r.pf += us;
    r.pa += them;
    if (us > them) r.w++;
    else if (us < them) r.l++;
    else r.t++;
    records.set(abbr, r);
  };

  for (const row of (data ?? []) as GameRow[]) {
    if (row.home_score === null || row.away_score === null) continue;
    bump(row.home_team, row.home_score, row.away_score);
    bump(row.away_team, row.away_score, row.home_score);
  }

  return records;
}
