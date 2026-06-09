import type { Game, GameDay } from '@/types/nfl';
import { TEAMS, getTeam, CURRENT_SEASON, TOTAL_WEEKS, CURRENT_WEEK, DAYS } from './teams';
import { rng } from '../utils/rng';

export const SUN_TIMES = ["13:00", "13:00", "13:00", "13:00", "16:05", "16:25", "16:25", "20:20"];

export function buildSchedule(): { home: string; away: string }[][] {
  const ids = TEAMS.map((t) => t.id);
  const n = ids.length;
  const fixed = ids[0];
  let rot = ids.slice(1);
  const weeks: { home: string; away: string }[][] = [];
  for (let w = 0; w < TOTAL_WEEKS; w++) {
    const list = [fixed, ...rot];
    const round: { home: string; away: string }[] = [];
    for (let i = 0; i < n / 2; i++) {
      const a = list[i];
      const b = list[n - 1 - i];
      const home = (w + i) % 2 === 0 ? a : b;
      const away = home === a ? b : a;
      round.push({ home, away });
    }
    weeks.push(round);
    rot = [rot[rot.length - 1], ...rot.slice(0, rot.length - 1)];
  }
  return weeks;
}

export function buildGames(): Game[] {
  const weeks = buildSchedule();
  const rand = rng(73);
  const games: Game[] = [];
  weeks.forEach((round, wIdx) => {
    const week = wIdx + 1;
    round.forEach((m, i) => {
      let day: GameDay = "Dom";
      let time = SUN_TIMES[i % SUN_TIMES.length];
      if (i === 0) { day = "Jue"; time = "20:15"; }
      else if (i === round.length - 1) { day = "Lun"; time = "20:15"; }

      let status: 'scheduled' | 'live' | 'final' = "scheduled";
      if (week < CURRENT_WEEK) status = "final";
      else if (week === CURRENT_WEEK) {
        if (day === "Jue") status = "final";
        else if (i >= 4 && i <= 5) status = "live";
        else if (i < 4) status = "final";
        else status = "scheduled";
      }

      const home = getTeam(m.home)!;
      let homeScore: number | null = null;
      let awayScore: number | null = null;
      let quarter: number | null = null;
      let clock: string | null = null;

      if (status === "final") {
        homeScore = 10 + Math.floor(rand() * 28);
        awayScore = 10 + Math.floor(rand() * 28);
        if (homeScore === awayScore) homeScore += 3;
      } else if (status === "live") {
        homeScore = Math.floor(rand() * 24);
        awayScore = Math.floor(rand() * 24);
        quarter = 1 + Math.floor(rand() * 4);
        clock = `${2 + Math.floor(rand() * 12)}:${String(Math.floor(rand() * 60)).padStart(2, "0")}`;
      }

      games.push({
        id: `w${week}-${m.away}-${m.home}`,
        week, day, time,
        season: CURRENT_SEASON,
        homeId: m.home, awayId: m.away,
        stadium: home.stadium,
        status, homeScore, awayScore, quarter, clock,
      });
    });
  });
  return games;
}

export const GAMES: Game[] = buildGames();

export const gamesByWeek = (week: number): Game[] => GAMES.filter((g) => g.week === week);
export const gamesByTeam = (teamId: string): Game[] => GAMES.filter((g) => g.homeId === teamId || g.awayId === teamId);
export const liveGames = (): Game[] => GAMES.filter((g) => g.status === "live");

export function groupByDay(list: Game[]) {
  const groups: Partial<Record<GameDay, Game[]>> = {};
  list.forEach((g) => {
    if (!groups[g.day]) groups[g.day] = [];
    groups[g.day]!.push(g);
  });
  return DAYS.filter((d) => groups[d]).map((d) => ({ day: d, games: groups[d]! }));
}
