import type { Game, GameDay } from '@/types/nfl';
import { DAYS } from './teams';

export * from './teams';

/** Group a list of games by NFL game day (Jue/Dom/Lun) in display order. */
export function groupByDay(list: Game[]) {
  const groups: Partial<Record<GameDay, Game[]>> = {};
  list.forEach((g) => {
    if (!groups[g.day]) groups[g.day] = [];
    groups[g.day]!.push(g);
  });
  return DAYS.filter((d) => groups[d]).map((d) => ({ day: d, games: groups[d]! }));
}
