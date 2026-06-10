import { espnUrls, weekDateRange, CURRENT_ESPN_YEAR } from '@/lib/espn/endpoints';
import { espnEventToGame } from '@/lib/espn/transform';
import { supabaseRead, supabaseAdmin } from '@/lib/supabase/server';
import type { EspnEvent, EspnScoreboardResponse } from '@/lib/espn/types';
import type { Game, GameDay, GameStatus, TeamRecord } from '@/types/nfl';

/**
 * Game history backed by Supabase (table: public.games).
 *
 * Write path (admin client, secret key):
 *   - syncScoreboard()  — upserts the current ESPN scoreboard; called by /api/refresh.
 *   - backfillSeason()  — loads a full season week by week; called by /api/backfill.
 *
 * Read path (publishable key, public RLS select):
 *   - getTeamSeason()   — one team's regular season with computed W-L-T record.
 *   - getHeadToHead()   — previous meetings between two teams.
 */

// ── Row mapping ──────────────────────────────────────────────────────────────

interface GameRow {
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
export function yearToSeason(year: number): string {
  return `${year}-${String((year + 1) % 100).padStart(2, '0')}`;
}

function eventToRow(event: EspnEvent, year: number): GameRow | null {
  const game = espnEventToGame(event, yearToSeason(year));
  if (!game) return null;
  return {
    id:          game.id,
    season:      event.season?.year ?? year,
    week:        game.week,
    season_type: event.season?.type ?? 2,
    game_date:   event.competitions?.[0]?.date ?? null,
    day:         game.day,
    time:        game.time,
    home_team:   game.homeId,
    away_team:   game.awayId,
    home_score:  game.homeScore,
    away_score:  game.awayScore,
    status:      game.status,
    stadium:     game.stadium,
    updated_at:  new Date().toISOString(),
  };
}

function rowToGame(row: GameRow): Game {
  return {
    id:        row.id,
    espnId:    row.id,
    week:      row.week,
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

/** Direct ESPN fetch, always fresh — sync must see live→final transitions. */
async function fetchScoreboard(url: string): Promise<EspnScoreboardResponse | null> {
  try {
    const res = await fetch(url, {
      cache: 'no-store',
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; RedZoneStats/1.0)' },
    });
    if (!res.ok) {
      console.warn(`[history] ESPN ${res.status} for ${url}`);
      return null;
    }
    return (await res.json()) as EspnScoreboardResponse;
  } catch (err) {
    console.warn(`[history] ESPN fetch error for ${url}:`, err);
    return null;
  }
}

async function upsertEvents(events: EspnEvent[], year: number): Promise<number> {
  const db = supabaseAdmin();
  if (!db || !events.length) return 0;

  const rows = events
    .map(e => eventToRow(e, year))
    .filter((r): r is GameRow => r !== null);
  if (!rows.length) return 0;

  const { error } = await db.from('games').upsert(rows, { onConflict: 'id' });
  if (error) {
    console.error('[history] upsert failed:', error.message);
    return 0;
  }
  return rows.length;
}

/**
 * Upserts every game on the current ESPN scoreboard.
 * Cheap (one request) — safe to run on every /api/refresh tick.
 * Also returns the IDs of finished games so the caller can sync their stats.
 */
export async function syncScoreboard(): Promise<{ synced: number; finalIds: string[] }> {
  const raw = await fetchScoreboard(espnUrls.scoreboard());
  if (!raw?.events?.length) return { synced: 0, finalIds: [] };
  const year = raw.season?.year ?? CURRENT_ESPN_YEAR;
  const synced = await upsertEvents(raw.events, year);
  const finalIds = raw.events
    .filter(e => e.competitions?.[0]?.status.type.state === 'post')
    .map(e => e.id);
  return { synced, finalIds };
}

/**
 * Loads a full season (weeks 1-18) into Supabase. Run once per season via
 * /api/backfill. Sequential on purpose — gentle on ESPN's unofficial API.
 */
export async function backfillSeason(
  year: number,
): Promise<{ year: number; weeks: number; games: number }> {
  let weeks = 0;
  let games = 0;

  for (let week = 1; week <= 18; week++) {
    // Always by date range — ESPN's week/season params only serve the most
    // recently played season, so they can't load an upcoming schedule
    const range = weekDateRange(year, week);
    if (!range) continue;

    const raw = await fetchScoreboard(espnUrls.scoreboardByDates(range));
    if (!raw?.events?.length) continue;

    games += await upsertEvents(raw.events, year);
    weeks++;
  }

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

/** Previous meetings between two teams (newest first, finals only). */
export async function getHeadToHead(
  teamA: string,
  teamB: string,
  limit = 10,
): Promise<Game[]> {
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
