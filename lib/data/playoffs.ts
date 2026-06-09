import type { PlayoffSeed, PlayoffMatchup, ConferenceBracket, PlayoffPicture, Conference } from '@/types/nfl';
import { rng } from '../utils/rng';
import { TEAMS } from './teams';
import { RECORDS } from './records';

export function confSeeds(conf: Conference): PlayoffSeed[] {
  return TEAMS.filter((t) => t.conf === conf)
    .sort((a, b) =>
      (RECORDS[b.id].w - RECORDS[a.id].w) ||
      (RECORDS[a.id].l - RECORDS[b.id].l) ||
      (RECORDS[b.id].pf - RECORDS[a.id].pf))
    .slice(0, 7)
    .map((t, i) => ({ seed: i + 1, id: t.id }));
}

export function confBracket(conf: Conference): ConferenceBracket {
  const seeds = confSeeds(conf);
  const bySeed: Record<number, PlayoffSeed> = Object.fromEntries(seeds.map((s) => [s.seed, s]));
  const r = rng(conf.charCodeAt(0) * 733 + conf.charCodeAt(1) * 17 + 5);

  const pick = (m: PlayoffMatchup): PlayoffSeed => {
    if (!m.a || !m.b) return (m.a || m.b)!;
    const fav = m.a.seed < m.b.seed ? m.a : m.b;
    const dog = fav === m.a ? m.b : m.a;
    return r() < 0.68 ? fav : dog!;
  };

  const wild: PlayoffMatchup[] = [
    { a: bySeed[2], b: bySeed[7] },
    { a: bySeed[3], b: bySeed[6] },
    { a: bySeed[4], b: bySeed[5] },
  ];
  const wildW = wild.map(pick);

  const alive = [bySeed[1], ...wildW].sort((x, y) => x.seed - y.seed);
  const divi: PlayoffMatchup[] = [
    { a: alive[0], b: alive[3] },
    { a: alive[1], b: alive[2] },
  ];
  const diviWin = divi.map(pick);
  const diviSorted = diviWin.slice().sort((x, y) => x.seed - y.seed);

  const final: PlayoffMatchup = { a: diviSorted[0], b: diviSorted[1] };
  const champ = pick(final);

  return { seeds, bye: bySeed[1], wild, wildW, divi, diviWin, final, champ };
}

export function playoffPicture(): PlayoffPicture {
  const afc = confBracket("AFC");
  const nfc = confBracket("NFC");
  const r = rng(9173);
  const champ = r() < 0.5 ? afc.champ : nfc.champ;
  return { afc, nfc, champ };
}
