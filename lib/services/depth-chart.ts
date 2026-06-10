import { espnFetch } from '@/lib/espn/client';
import { espnUrls, seasonToYear, CURRENT_ESPN_YEAR } from '@/lib/espn/endpoints';
import { teamDepthChart, CURRENT_SEASON } from '@/lib/data';
import type { EspnRosterResponse, EspnRosterAthlete } from '@/lib/espn/types';
import type { DepthGroup, DepthPlayer } from '@/types/nfl';

// Reuse the ESPN team ID map from team-detail (duplicated here for independence)
const ESPN_TEAM_IDS: Record<string, string> = {
  BUF: '2',  MIA: '15', NE: '17',  NYJ: '20',
  BAL: '33', CIN: '4',  CLE: '5',  PIT: '23',
  HOU: '34', IND: '11', JAX: '30', TEN: '10',
  DEN: '7',  KC: '12',  LV: '13',  LAC: '24',
  DAL: '6',  NYG: '19', PHI: '21', WAS: '28',
  CHI: '3',  DET: '8',  GB: '9',   MIN: '16',
  ATL: '1',  CAR: '29', NO: '18',  TB: '27',
  ARI: '22', LAR: '14', SF: '25',  SEA: '26',
};

// Map ESPN roster group names → our group labels
const GROUP_LABEL: Record<string, string> = {
  offense:     'Ofensiva',
  defense:     'Defensiva',
  specialTeam: 'Especiales',
};

// Positions we want to show, in display order, mapped to our canonical labels.
// Shared with the nflverse roster service (lib/services/roster.ts).
export const POSITION_CONFIG: Record<string, { group: string; label: string }> = {
  QB: { group: 'Ofensiva',   label: 'Quarterback' },
  RB: { group: 'Ofensiva',   label: 'Running Back' },
  FB: { group: 'Ofensiva',   label: 'Fullback' },
  WR: { group: 'Ofensiva',   label: 'Wide Receiver' },
  TE: { group: 'Ofensiva',   label: 'Tight End' },
  LT: { group: 'Ofensiva',   label: 'Left Tackle' },
  RT: { group: 'Ofensiva',   label: 'Right Tackle' },
  LG: { group: 'Ofensiva',   label: 'Left Guard' },
  RG: { group: 'Ofensiva',   label: 'Right Guard' },
  C:  { group: 'Ofensiva',   label: 'Center' },
  OL: { group: 'Ofensiva',   label: 'Línea ofensiva' },
  T:  { group: 'Ofensiva',   label: 'Tackle' },
  G:  { group: 'Ofensiva',   label: 'Guard' },
  DE: { group: 'Defensiva',  label: 'Defensive End' },
  DT: { group: 'Defensiva',  label: 'Defensive Tackle' },
  NT: { group: 'Defensiva',  label: 'Nose Tackle' },
  DL: { group: 'Defensiva',  label: 'Línea defensiva' },
  LB: { group: 'Defensiva',  label: 'Linebacker' },
  OLB:{ group: 'Defensiva',  label: 'Outside Linebacker' },
  MLB:{ group: 'Defensiva',  label: 'Middle Linebacker' },
  ILB:{ group: 'Defensiva',  label: 'Inside Linebacker' },
  CB: { group: 'Defensiva',  label: 'Cornerback' },
  S:  { group: 'Defensiva',  label: 'Safety' },
  FS: { group: 'Defensiva',  label: 'Free Safety' },
  SS: { group: 'Defensiva',  label: 'Strong Safety' },
  DB: { group: 'Defensiva',  label: 'Defensive Back' },
  K:  { group: 'Especiales', label: 'Kicker' },
  PK: { group: 'Especiales', label: 'Kicker' },
  P:  { group: 'Especiales', label: 'Punter' },
  LS: { group: 'Especiales', label: 'Long Snapper' },
  KR: { group: 'Especiales', label: 'Kick Returner' },
  PR: { group: 'Especiales', label: 'Punt Returner' },
  H:  { group: 'Especiales', label: 'Holder' },
};

export const POSITION_ORDER = ['QB','RB','FB','WR','TE','T','G','C','OL','LT','RT','LG','RG',
                               'DE','DT','NT','DL','LB','OLB','MLB','ILB','CB','S','FS','SS','DB',
                               'K','PK','P','LS','KR','PR','H'];

function transformRoster(espnGroups: EspnRosterResponse['athletes']): DepthGroup[] {
  // Collect all active players grouped by position abbreviation
  const byPos: Record<string, { group: string; label: string; players: EspnRosterAthlete[] }> = {};

  for (const g of espnGroups) {
    // Skip non-active groups
    if (!['offense', 'defense', 'specialTeam'].includes(g.position)) continue;
    const groupLabel = GROUP_LABEL[g.position] ?? g.position;

    for (const athlete of g.items ?? []) {
      const pos = athlete.position?.abbreviation ?? 'UNK';
      if (!byPos[pos]) {
        const cfg = POSITION_CONFIG[pos];
        byPos[pos] = {
          group: cfg?.group ?? groupLabel,
          label: cfg?.label ?? athlete.position?.displayName ?? pos,
          players: [],
        };
      }
      byPos[pos].players.push(athlete);
    }
  }

  // Build DepthGroup[] in our canonical order
  const groups: DepthGroup[] = [];
  for (const pos of POSITION_ORDER) {
    if (!byPos[pos]?.players.length) continue;
    const { group, label, players } = byPos[pos];
    groups.push({
      group,
      pos,
      label,
      stats: [],  // No season stats from roster endpoint; Phase 2c will add them via core API
      players: players.map((a, i): DepthPlayer => ({
        name:  a.fullName,
        num:   parseInt(a.jersey ?? '0', 10) || 0,
        pos,
        depth: i,
        stats: {},
      })),
    });
  }
  return groups;
}

/**
 * Returns depth chart / roster for a team and season.
 * - Current season: live ESPN roster (falls back to deterministic mock).
 * - Past seasons: stored nflverse depth chart from Supabase (empty when the
 *   season hasn't been backfilled — the UI shows a message, never fake data).
 */
export async function getDepthChart(abbr: string, season = CURRENT_SEASON): Promise<DepthGroup[]> {
  const year = seasonToYear(season);

  if (year !== CURRENT_ESPN_YEAR) {
    // Lazy import avoids a circular dependency (roster.ts imports our config)
    const { getStoredDepthChart } = await import('./roster');
    return (await getStoredDepthChart(abbr, year)) ?? [];
  }

  const espnId = ESPN_TEAM_IDS[abbr];
  if (!espnId) return teamDepthChart(abbr);

  const raw = await espnFetch<EspnRosterResponse>(
    espnUrls.teamRoster(espnId),
    `espn-roster-${abbr}`,
    3600,  // 1-hour cache; rosters don't change mid-game
  );

  if (!raw?.athletes?.length) return teamDepthChart(abbr);

  const groups = transformRoster(raw.athletes);
  return groups.length ? groups : teamDepthChart(abbr);
}
