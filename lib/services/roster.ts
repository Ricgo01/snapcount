import { supabaseRead, supabaseAdmin } from '@/lib/supabase/server';
import { normalizeAbbr } from '@/lib/espn/transform';
import { parseCsvLine } from '@/lib/nflverse/csv';
import { POSITION_CONFIG, POSITION_ORDER } from './depth-chart';
import type { DepthGroup, DepthPlayer } from '@/types/nfl';

/**
 * Historical rosters / depth charts backed by Supabase (table: public.rosters).
 *
 * Source: nflverse depth_charts dataset — real per-week NFL depth charts back
 * to 2001 (github.com/nflverse/nflverse-data). One snapshot per team-season:
 * the last regular-season week. Filled once per season by /api/backfill-rosters.
 */

const NFLVERSE_URL = (year: number) =>
  `https://github.com/nflverse/nflverse-data/releases/download/depth_charts/depth_charts_${year}.csv`;

// depth_charts_{year}.csv (2025+) has no jersey_number column — only gsis_id.
// roster_{year}.csv does have jersey_number, keyed by the same gsis_id.
const NFLVERSE_ROSTER_URL = (year: number) =>
  `https://github.com/nflverse/nflverse-data/releases/download/rosters/roster_${year}.csv`;

interface RosterRow {
  season: number;
  team: string;
  position: string;
  player_name: string;
  jersey: number | null;
  depth: number;
  formation: string | null;
  updated_at: string;
}

// ── Write path ───────────────────────────────────────────────────────────────

interface Parsed { team: string; snapshot: string; depth: number; pos: string; jersey: number | null; name: string; formation: string | null; gsisId?: string; }

/** Legacy nflverse format (≤2024): one depth chart per week, jersey included. */
function parseLegacyFormat(lines: string[], header: string[]): Parsed[] {
  const col = (name: string) => header.indexOf(name);
  const iClub = col('club_code'), iWeek = col('week'), iType = col('game_type'),
        iDepth = col('depth_team'), iPos = col('position'),
        iJersey = col('jersey_number'), iName = col('full_name'),
        iFormation = col('formation');

  const parsed: Parsed[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line || line.length < 5) continue;
    const f = parseCsvLine(line.trim());
    if (f[iType] !== 'REG') continue;
    const team = normalizeAbbr(f[iClub]);
    const week = parseInt(f[iWeek], 10);
    const depth = parseInt(f[iDepth], 10);
    const name = f[iName];
    const pos  = f[iPos];
    if (!team || !name || !pos || Number.isNaN(week) || Number.isNaN(depth)) continue;
    parsed.push({
      team, pos, name,
      snapshot: String(week).padStart(2, '0'),  // sortable
      depth,
      jersey: (() => {
        const n = parseInt(f[iJersey], 10);
        return Number.isFinite(n) ? n : null; // preserves a real #0 (legal since 2023)
      })(),
      formation: iFormation >= 0 ? f[iFormation] || null : null,
    });
  }
  return parsed;
}

/** Slot positions (new format) → canonical position codes. */
const SLOT_POS: Record<string, string> = {
  LDE: 'DE', RDE: 'DE', LDT: 'DT', RDT: 'DT',
  WLB: 'OLB', SLB: 'OLB', LOLB: 'OLB', ROLB: 'OLB',
  LILB: 'ILB', RILB: 'ILB',
  LCB: 'CB', RCB: 'CB', NB: 'CB',
  LWR: 'WR', RWR: 'WR', SWR: 'WR',
  PK: 'K', KO: 'K',
};

/** New nflverse format (2025+): dated snapshots, granular slots, no jersey
 *  (joined in separately from roster_{year}.csv via gsis_id). */
function parseNewFormat(lines: string[], header: string[]): Parsed[] {
  const col = (name: string) => header.indexOf(name);
  const iDt = col('dt'), iTeam = col('team'), iName = col('player_name'),
        iPosAbb = col('pos_abb'), iRank = col('pos_rank'), iGrp = col('pos_grp'),
        iGsis = col('gsis_id');

  const parsed: Parsed[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line || line.length < 5) continue;
    const f = parseCsvLine(line.trim());
    const team = normalizeAbbr(f[iTeam]);
    const name = f[iName];
    const slot = f[iPosAbb];
    const depth = parseInt(f[iRank], 10);
    if (!team || !name || !slot || Number.isNaN(depth)) continue;
    const grp = f[iGrp] ?? '';
    parsed.push({
      team, name,
      pos: SLOT_POS[slot] ?? slot,
      snapshot: f[iDt],  // ISO timestamp, sortable
      depth,
      jersey: null,
      formation: grp === 'Special Teams' ? 'Special Teams'
               : / D$|^Nickel|^Dime/.test(grp) ? 'Defense' : 'Offense',
      gsisId: iGsis >= 0 ? f[iGsis] || undefined : undefined,
    });
  }
  return parsed;
}

/** gsis_id → jersey_number from nflverse's season roster file (any week works — jersey rarely changes). */
async function fetchJerseyNumbers(year: number): Promise<Map<string, number>> {
  const jerseys = new Map<string, number>();
  let text: string;
  try {
    const res = await fetch(NFLVERSE_ROSTER_URL(year), {
      cache: 'no-store',
      signal: AbortSignal.timeout(60_000),
    });
    if (!res.ok) {
      console.warn(`[roster] nflverse roster ${res.status} for ${year}`);
      return jerseys;
    }
    text = await res.text();
  } catch (err) {
    console.warn(`[roster] nflverse roster fetch error for ${year}:`, err);
    return jerseys;
  }

  const lines = text.split('\n');
  const header = parseCsvLine(lines[0].trim());
  const iGsis = header.indexOf('gsis_id'), iJersey = header.indexOf('jersey_number');
  if (iGsis < 0 || iJersey < 0) return jerseys;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line || line.length < 5) continue;
    const f = parseCsvLine(line.trim());
    const gsisId = f[iGsis];
    const num = parseInt(f[iJersey], 10);
    if (gsisId && Number.isFinite(num)) jerseys.set(gsisId, num);
  }
  return jerseys;
}

/**
 * Downloads the nflverse depth chart CSV for a season and stores the last
 * regular-season snapshot of every team.
 */
export async function backfillRosters(
  year: number,
): Promise<{ year: number; teams: number; players: number }> {
  const db = supabaseAdmin();
  if (!db) return { year, teams: 0, players: 0 };

  let text: string;
  try {
    const res = await fetch(NFLVERSE_URL(year), {
      cache: 'no-store',
      signal: AbortSignal.timeout(60_000),
    });
    if (!res.ok) {
      console.warn(`[roster] nflverse ${res.status} for ${year}`);
      return { year, teams: 0, players: 0 };
    }
    text = await res.text();
  } catch (err) {
    console.warn(`[roster] nflverse fetch error for ${year}:`, err);
    return { year, teams: 0, players: 0 };
  }
  const lines = text.split('\n');
  const header = parseCsvLine(lines[0].trim());

  let parsed: Parsed[];
  if (header.includes('club_code')) {
    parsed = parseLegacyFormat(lines, header);
  } else if (header.includes('pos_abb')) {
    parsed = parseNewFormat(lines, header);
    const jerseys = await fetchJerseyNumbers(year);
    for (const p of parsed) {
      if (p.gsisId) p.jersey = jerseys.get(p.gsisId) ?? null;
    }
  } else {
    console.warn(`[roster] unexpected nflverse CSV header for ${year}`);
    return { year, teams: 0, players: 0 };
  }

  // Latest snapshot per team, dedupe (team, pos, player) → min depth
  const lastSnap = new Map<string, string>();
  for (const p of parsed) {
    if (p.snapshot > (lastSnap.get(p.team) ?? '')) lastSnap.set(p.team, p.snapshot);
  }
  const byKey = new Map<string, RosterRow>();
  for (const p of parsed) {
    if (p.snapshot !== lastSnap.get(p.team)) continue;
    const key = `${p.team}|${p.pos}|${p.name}`;
    const prev = byKey.get(key);
    if (prev && prev.depth <= p.depth) continue;
    byKey.set(key, {
      season: year, team: p.team, position: p.pos, player_name: p.name,
      jersey: p.jersey, depth: p.depth, formation: p.formation,
      updated_at: new Date().toISOString(),
    });
  }
  const rows = [...byKey.values()];
  if (!rows.length) return { year, teams: 0, players: 0 };

  // Upsert in chunks (PostgREST payload limits)
  for (let i = 0; i < rows.length; i += 500) {
    const { error } = await db.from('rosters').upsert(rows.slice(i, i + 500), {
      onConflict: 'season,team,position,player_name',
    });
    if (error) {
      console.error('[roster] upsert failed:', error.message);
      return { year, teams: lastSnap.size, players: i };
    }
  }
  return { year, teams: lastSnap.size, players: rows.length };
}

// ── Read path ────────────────────────────────────────────────────────────────

const FORMATION_GROUP: Record<string, string> = {
  'Offense':       'Ofensiva',
  'Defense':       'Defensiva',
  'Special Teams': 'Especiales',
};

/** Stored depth chart for a team-season as DepthGroup[] (null when missing). */
export async function getStoredDepthChart(abbr: string, year: number): Promise<DepthGroup[] | null> {
  const db = supabaseRead();
  if (!db) return null;

  const { data, error } = await db
    .from('rosters')
    .select('*')
    .eq('team', abbr)
    .eq('season', year)
    .order('depth', { ascending: true })
    .order('jersey', { ascending: true });

  if (error) {
    console.warn('[roster] getStoredDepthChart failed:', error.message);
    return null;
  }
  const rows = (data ?? []) as RosterRow[];
  if (!rows.length) return null;

  const byPos = new Map<string, RosterRow[]>();
  for (const r of rows) {
    const list = byPos.get(r.position) ?? [];
    list.push(r);
    byPos.set(r.position, list);
  }

  const toGroup = (pos: string, posRows: RosterRow[]): DepthGroup => {
    const cfg = POSITION_CONFIG[pos];
    return {
      group: cfg?.group ?? FORMATION_GROUP[posRows[0].formation ?? ''] ?? 'Ofensiva',
      pos,
      label: cfg?.label ?? pos,
      stats: [],
      players: posRows.map((r, i): DepthPlayer => ({
        name:  r.player_name,
        num:   r.jersey,
        pos,
        depth: i,
        stats: {},
      })),
    };
  };

  const groups: DepthGroup[] = [];
  for (const pos of POSITION_ORDER) {
    const posRows = byPos.get(pos);
    if (!posRows?.length) continue;
    groups.push(toGroup(pos, posRows));
    byPos.delete(pos);
  }
  // Any position not in our canonical order goes at the end
  for (const [pos, posRows] of byPos) groups.push(toGroup(pos, posRows));

  return groups;
}
