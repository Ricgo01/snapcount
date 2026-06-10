export type Conference = 'AFC' | 'NFC';
export type Division   = 'North' | 'South' | 'East' | 'West';
export type GameStatus = 'scheduled' | 'live' | 'final';
export type GameDay    = 'Jue' | 'Dom' | 'Lun';

export interface Team {
  id: string;
  city: string;
  name: string;
  conf: Conference;
  div: Division;
  primary: string;
  secondary: string;
  stadium: string;
  logo?: string;
  banner?: string;
}

export interface Game {
  id: string;
  espnId?: string;          // ESPN event ID — present when data comes from ESPN
  week: number;
  day: GameDay;
  time: string;
  season: string;
  homeId: string;
  awayId: string;
  stadium: string;
  status: GameStatus;
  homeScore: number | null;
  awayScore: number | null;
  quarter: number | null;
  clock: string | null;
}

export interface TeamRecord {
  w: number;
  l: number;
  t: number;
  pf: number;
  pa: number;
}

export interface DayGroup {
  day: GameDay;
  games: Game[];
}

export interface TeamStats {
  yards: number;
  pass: number;
  rush: number;
  first: number;
  poss: string;
  turn: number;
  third: string;
}

export interface GameStatsResult {
  home: TeamStats;
  away: TeamStats;
}

export interface PlayerStatCategory {
  name: string;       // ESPN category id: passing, rushing, receiving, defensive, ...
  labels: string[];   // column headers as ESPN sends them: C/ATT, YDS, TD, ...
  rows: { name: string; vals: string[] }[];  // one row per player
  totals: string[];   // team totals row ([] when ESPN doesn't provide one)
}

export interface PlayerStatsTeam {
  categories: PlayerStatCategory[];
}

export interface PlayerStatsResult {
  home: PlayerStatsTeam;
  away: PlayerStatsTeam;
}

export interface DepthPlayer {
  name: string;
  num: number;
  pos: string;
  depth: number;
  stats: Record<string, string | number>;
}

export interface DepthGroup {
  group: string;
  pos: string;
  label: string;
  stats: string[];
  players: DepthPlayer[];
}

export interface PlayoffSeed {
  seed: number;
  id: string;
}

export interface PlayoffMatchup {
  a: PlayoffSeed | null;
  b: PlayoffSeed | null;
  aScore?: number | null;
  bScore?: number | null;
  /** ESPN event ID — links the bracket box to /game/{id} when present */
  gameId?: string;
}

export interface ConferenceBracket {
  seeds: PlayoffSeed[];
  bye: PlayoffSeed;
  wild: PlayoffMatchup[];
  wildW: PlayoffSeed[];
  divi: PlayoffMatchup[];
  diviWin: PlayoffSeed[];
  final: PlayoffMatchup;
  champ: PlayoffSeed;
}

export interface PlayoffPicture {
  afc: ConferenceBracket;
  nfc: ConferenceBracket;
  champ: PlayoffSeed;
  /** Super Bowl matchup with scores — a: AFC side, b: NFC side */
  sb?: PlayoffMatchup;
  /** true when built from real ESPN results (vs projected mock) */
  real?: boolean;
}
