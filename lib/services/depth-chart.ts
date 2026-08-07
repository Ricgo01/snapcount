import { seasonToYear } from '@/lib/espn/endpoints';
import { CURRENT_SEASON } from '@/lib/data';
import type { DepthGroup } from '@/types/nfl';

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

/**
 * Returns depth chart / roster for a team and season — always from Supabase
 * (nflverse-backed, filled by /api/backfill-rosters). `backfillRosters`
 * already takes the *latest available* snapshot per team, so this works for
 * the current season too, not just completed ones — it just needs the
 * route re-run periodically during the season to stay fresh (weekly cron).
 * Empty when that season/team hasn't been backfilled yet — the UI shows a
 * message, never fake data.
 */
export async function getDepthChart(abbr: string, season = CURRENT_SEASON): Promise<DepthGroup[]> {
  const year = seasonToYear(season);
  // Lazy import avoids a circular dependency (roster.ts imports our config)
  const { getStoredDepthChart } = await import('./roster');
  return (await getStoredDepthChart(abbr, year)) ?? [];
}
