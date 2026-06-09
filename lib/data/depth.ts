import type { DepthGroup, DepthPlayer } from '@/types/nfl';
import { rng } from '../utils/rng';
import { FIRST_NAMES, LAST_NAMES } from './stats';

export const DEPTH_POSITIONS = [
  { group: "Ofensiva", pos: "QB", label: "Quarterback", n: 2, stats: ["GP", "Cmp/Att", "Yds", "TD", "INT"] },
  { group: "Ofensiva", pos: "RB", label: "Running Back", n: 3, stats: ["GP", "Car", "Yds", "Prom", "TD"] },
  { group: "Ofensiva", pos: "WR", label: "Wide Receiver", n: 4, stats: ["GP", "Rec", "Yds", "Prom", "TD"] },
  { group: "Ofensiva", pos: "TE", label: "Tight End", n: 2, stats: ["GP", "Rec", "Yds", "Prom", "TD"] },
  { group: "Ofensiva", pos: "OL", label: "Línea ofensiva", n: 5, stats: ["GP", "GS", "Pen"] },
  { group: "Defensiva", pos: "DL", label: "Línea defensiva", n: 4, stats: ["GP", "Tkl", "Sacks", "TFL"] },
  { group: "Defensiva", pos: "LB", label: "Linebacker", n: 4, stats: ["GP", "Tkl", "Sacks", "PD"] },
  { group: "Defensiva", pos: "DB", label: "Defensive Back", n: 5, stats: ["GP", "Tkl", "INT", "PD"] },
  { group: "Especiales", pos: "K", label: "Kicker", n: 1, stats: ["GP", "FG", "Long", "Pts"] },
  { group: "Especiales", pos: "P", label: "Punter", n: 1, stats: ["GP", "Punts", "Prom", "In20"] },
];

export function depthStats(pos: string, r: () => number): Record<string, string | number> {
  const ri = (a: number, b: number) => a + Math.floor(r() * (b - a + 1));
  const gp = ri(6, 14);
  switch (pos) {
    case "QB": {
      const att = ri(140, 430);
      const cmp = Math.round(att * (0.58 + r() * 0.12));
      return { GP: gp, "Cmp/Att": `${cmp}/${att}`, Yds: ri(1100, 3900), TD: ri(6, 33), INT: ri(2, 14) };
    }
    case "RB": {
      const car = ri(24, 270);
      const yds = ri(90, 1450);
      return { GP: gp, Car: car, Yds: yds, Prom: (yds / Math.max(car, 1)).toFixed(1), TD: ri(0, 15) };
    }
    case "WR":
    case "TE": {
      const rec = ri(10, 108);
      const yds = ri(110, 1500);
      return { GP: gp, Rec: rec, Yds: yds, Prom: (yds / Math.max(rec, 1)).toFixed(1), TD: ri(0, 13) };
    }
    case "OL": return { GP: gp, GS: ri(0, gp), Pen: ri(0, 9) };
    case "DL": return { GP: gp, Tkl: ri(10, 72), Sacks: ri(0, 16), TFL: ri(1, 21) };
    case "LB": return { GP: gp, Tkl: ri(28, 145), Sacks: ri(0, 9), PD: ri(0, 12) };
    case "DB": return { GP: gp, Tkl: ri(18, 98), INT: ri(0, 7), PD: ri(2, 21) };
    case "K": {
      const fga = ri(14, 38);
      return { GP: gp, FG: `${ri(10, fga)}/${fga}`, Long: ri(44, 58), Pts: ri(55, 150) };
    }
    case "P": return { GP: gp, Punts: ri(32, 80), Prom: (43 + r() * 7).toFixed(1), In20: ri(10, 34) };
    default: return { GP: gp };
  }
}

export function teamDepthChart(teamId: string): DepthGroup[] {
  const seed = teamId.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const r = rng(seed * 613 + 29);
  const usedF = new Set<string>();
  const usedL = new Set<string>();
  const usedNum = new Set<number>();
  const pick = (pool: string[], used: Set<string>): string => {
    let n = pool[0];
    let g = 0;
    do { n = pool[Math.floor(r() * pool.length)]; g++; } while (used.has(n) && g < 80);
    used.add(n);
    return n;
  };
  const mkName = () => `${pick(FIRST_NAMES, usedF)} ${pick(LAST_NAMES, usedL)}`;
  const mkNum = (): number => {
    let n = 1;
    let g = 0;
    do { n = 1 + Math.floor(r() * 98); g++; } while (usedNum.has(n) && g < 300);
    usedNum.add(n);
    return n;
  };
  return DEPTH_POSITIONS.map((def) => ({
    group: def.group,
    pos: def.pos,
    label: def.label,
    stats: def.stats,
    players: Array.from({ length: def.n }, (_, i): DepthPlayer => ({
      name: mkName(),
      num: mkNum(),
      pos: def.pos,
      depth: i,
      stats: depthStats(def.pos, r),
    })),
  }));
}
