import type { Game, GameDay } from '@/types/nfl';
import { DAYS } from './teams';

export * from './teams';

/** Group a list of games by NFL game day, in real kickoff order when dates exist. */
export function groupByDay(list: Game[]) {
  const sorted = [...list].sort((a, b) =>
    a.date && b.date ? new Date(a.date).getTime() - new Date(b.date).getTime() : 0,
  );
  const groups = new Map<GameDay, Game[]>();
  sorted.forEach((g) => {
    if (!groups.has(g.day)) groups.set(g.day, []);
    groups.get(g.day)!.push(g);
  });
  // With dates, Map insertion order is already chronological; without them,
  // fall back to the canonical NFL-week day order.
  if (sorted.some((g) => g.date)) {
    return [...groups.entries()].map(([day, games]) => ({ day, games }));
  }
  return DAYS.filter((d) => groups.has(d)).map((d) => ({ day: d, games: groups.get(d)! }));
}
