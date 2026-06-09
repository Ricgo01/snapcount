import type { TeamRecord, Conference, Division } from '@/types/nfl';
import { TEAMS } from './teams';
import { GAMES } from './schedule';

export function computeRecords(): Record<string, TeamRecord> {
  const rec: Record<string, TeamRecord> = {};
  TEAMS.forEach((t) => (rec[t.id] = { w: 0, l: 0, t: 0, pf: 0, pa: 0 }));
  GAMES.forEach((g) => {
    if (g.status !== "final") return;
    const h = rec[g.homeId];
    const a = rec[g.awayId];
    h.pf += g.homeScore!; h.pa += g.awayScore!;
    a.pf += g.awayScore!; a.pa += g.homeScore!;
    if (g.homeScore! > g.awayScore!) { h.w++; a.l++; }
    else if (g.homeScore! < g.awayScore!) { a.w++; h.l++; }
    else { h.t++; a.t++; }
  });
  return rec;
}

export const RECORDS: Record<string, TeamRecord> = computeRecords();

export const recordStr = (id: string): string => {
  const r = RECORDS[id];
  return r.t ? `${r.w}-${r.l}-${r.t}` : `${r.w}-${r.l}`;
};

export const teamsByConfDiv = (conf: Conference, div: Division) =>
  TEAMS.filter((t) => t.conf === conf && t.div === div)
    .sort((a, b) => (RECORDS[b.id].w - RECORDS[a.id].w) || (RECORDS[a.id].l - RECORDS[b.id].l));
