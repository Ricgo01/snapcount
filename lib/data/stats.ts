import type { Game, GameStatsResult, PlayerStatsResult } from '@/types/nfl';
import { rng } from '../utils/rng';
import { getTeam, fullName, DAY_FULL } from './teams';

export const FIRST_NAMES = [
  "Jalen", "Patrick", "Josh", "Lamar", "Joe", "Trevor", "Justin", "Dak", "Jared", "Brock",
  "Marcus", "Tyler", "Cooper", "Davante", "Stefon", "Saquon", "Derrick", "Nick", "Travis", "George",
  "Christian", "Bijan", "Jahmyr", "Breece", "DeVonta", "Garrett", "Mike", "Chris", "Tony", "Amari",
  "Malik", "Xavier", "Kenneth", "Rhamondre", "Isaiah", "Jaylen", "Calvin", "Drake", "Romeo", "Zay",
];

export const LAST_NAMES = [
  "Mahomes", "Allen", "Jackson", "Burrow", "Lawrence", "Herbert", "Prescott", "Goff", "Purdy", "Smith",
  "Williams", "Daniels", "Brown", "Adams", "Diggs", "Chase", "Barkley", "Henry", "Chubb", "Kelce",
  "Kittle", "Andrews", "McCaffrey", "Robinson", "Gibbs", "Hall", "Jefferson", "Lamb", "Evans", "Pollard",
  "Metcalf", "Higgins", "Aiyuk", "Olave", "Nabers", "London", "Wilson", "Moore", "Ridley", "Pittman",
];

export function chronicle(g: Game): string {
  const home = getTeam(g.homeId)!;
  const away = getTeam(g.awayId)!;
  const w = g.status === "final" ? (g.homeScore! > g.awayScore! ? home : away) : null;
  if (g.status === "live") {
    return `Partido en desarrollo en ${g.stadium}. ${fullName(away)} visita a ${fullName(home)} en un duelo clave de la Semana ${g.week}. El marcador va ${g.awayScore}-${g.homeScore} en el ${g.quarter}º cuarto, con ${g.clock} por jugar. La defensa local presiona y el ataque visitante busca controlar el reloj.`;
  }
  if (g.status === "final" && w) {
    return `${fullName(w)} se impuso ${Math.max(g.homeScore!, g.awayScore!)}-${Math.min(g.homeScore!, g.awayScore!)} ante ${fullName(w.id === home.id ? away : home)} en ${g.stadium}. Un encuentro de la Semana ${g.week} que se definió en los detalles: eficiencia en zona roja y control del balón terminaron inclinando la balanza. El equipo ganador firmó una actuación sólida en ambas fases del juego.`;
  }
  return `${fullName(away)} visita a ${fullName(home)} en ${g.stadium} por la Semana ${g.week}. Programado para el ${DAY_FULL[g.day]} a las ${g.time}. Dos equipos que llegan con objetivos claros de cara al cierre de la temporada.`;
}

export function teamStats(g: Game): GameStatsResult {
  const r = rng(g.week * 131 + g.homeId.charCodeAt(0) + g.awayId.charCodeAt(0));
  const mk = () => ({
    yards: 250 + Math.floor(r() * 220),
    pass: 150 + Math.floor(r() * 200),
    rush: 60 + Math.floor(r() * 150),
    first: 14 + Math.floor(r() * 14),
    poss: `${24 + Math.floor(r() * 8)}:${String(Math.floor(r() * 60)).padStart(2, "0")}`,
    turn: Math.floor(r() * 4),
    third: `${3 + Math.floor(r() * 7)}/${10 + Math.floor(r() * 5)}`,
  });
  return { home: mk(), away: mk() };
}

export function teamRoster(teamId: string) {
  const seed = teamId.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const r = rng(seed * 977 + 13);
  const usedF = new Set<string>();
  const usedL = new Set<string>();
  const pick = (pool: string[], used: Set<string>): string => {
    let n = pool[0];
    let guard = 0;
    do { n = pool[Math.floor(r() * pool.length)]; guard++; } while (used.has(n) && guard < 40);
    used.add(n);
    return n;
  };
  const mkName = () => `${pick(FIRST_NAMES, usedF)} ${pick(LAST_NAMES, usedL)}`;
  return { qb: mkName(), rb: [mkName(), mkName()], wr: [mkName(), mkName(), mkName()] };
}

export function playerStats(g: Game): PlayerStatsResult | null {
  if (g.status === "scheduled") return null;
  const base = g.week * 271 + g.homeId.charCodeAt(0) * 7 + g.awayId.charCodeAt(0) * 3;
  const mk = (teamId: string, offset: number) => {
    const roster = teamRoster(teamId);
    const r = rng(base + offset);
    const comp = 18 + Math.floor(r() * 16);
    const att = comp + 4 + Math.floor(r() * 14);
    return {
      categories: [
        {
          name: "passing",
          labels: ["C/ATT", "YDS", "TD", "INT"],
          rows: [{ name: roster.qb, vals: [`${comp}/${att}`, String(180 + Math.floor(r() * 200)), String(Math.floor(r() * 4)), String(Math.floor(r() * 3))] }],
          totals: [],
        },
        {
          name: "rushing",
          labels: ["CAR", "YDS", "TD"],
          rows: roster.rb.map((n) => ({ name: n, vals: [String(8 + Math.floor(r() * 16)), String(28 + Math.floor(r() * 95)), String(Math.floor(r() * 2))] })),
          totals: [],
        },
        {
          name: "receiving",
          labels: ["REC", "YDS", "TD"],
          rows: roster.wr.map((n) => ({ name: n, vals: [String(3 + Math.floor(r() * 8)), String(25 + Math.floor(r() * 95)), String(Math.floor(r() * 2))] })),
          totals: [],
        },
      ],
    };
  };
  return { away: mk(g.awayId, 17), home: mk(g.homeId, 53) };
}
