// Minimal ESPN API response types — only the fields we actually consume.
// Full ESPN responses contain dozens of extra fields; we ignore them.

export interface EspnTeamRef {
  id: string;
  abbreviation: string;
  displayName: string;
  shortDisplayName: string;
  location: string;
  name: string;
  color: string;           // hex without '#'
  alternateColor: string;  // hex without '#'
}

export interface EspnCompetitor {
  id: string;
  homeAway: 'home' | 'away';
  /** Scoreboard returns a string; team schedule returns an object */
  score?: string | { value: number; displayValue: string };
  team: EspnTeamRef;
}

export interface EspnStatusType {
  id: string;
  name: string;        // "STATUS_SCHEDULED" | "STATUS_IN_PROGRESS" | "STATUS_FINAL" | "STATUS_HALFTIME"
  state: string;       // "pre" | "in" | "post"
  completed: boolean;
  description: string; // "Scheduled" | "In Progress" | "Final" | "Halftime"
}

export interface EspnStatus {
  clock: number;
  displayClock: string;  // "14:32" or "0:00"
  period: number;        // quarter 1-4, 0 if pre
  type: EspnStatusType;
}

export interface EspnVenue {
  fullName: string;
  city?: string;
  state?: string;
}

export interface EspnCompetition {
  id: string;
  date: string;          // ISO 8601 UTC
  status: EspnStatus;
  competitors: EspnCompetitor[];
  venue?: EspnVenue;
}

export interface EspnEvent {
  id: string;
  name: string;
  shortName: string;     // "BUF @ PHI"
  week?: { number: number };
  season?: { year: number; type: number };
  competitions: EspnCompetition[];
}

export interface EspnScoreboardResponse {
  season?: { year: number; type: number };
  week?: { number: number };
  events: EspnEvent[];
}

// ── Standings ──────────────────────────────────────────────────────────────

export interface EspnStandingsStat {
  name: string;   // "wins" | "losses" | "ties" | "pointsFor" | "pointsAgainst"
  value: number;
}

export interface EspnStandingsEntry {
  team: Pick<EspnTeamRef, 'id' | 'abbreviation' | 'displayName'>;
  stats: EspnStandingsStat[];
}

export interface EspnStandingsGroup {
  name: string;        // "AFC East" etc.
  abbreviation: string; // "AFCE"
  standings?: { entries: EspnStandingsEntry[] };
}

export interface EspnStandingsConference {
  name: string;        // "American Football Conference"
  abbreviation: string; // "AFC"
  children: EspnStandingsGroup[];
}

export interface EspnStandingsResponse {
  children: EspnStandingsConference[];
}

// ── Game summary (box score) ───────────────────────────────────────────────

export interface EspnBoxScoreStat {
  name: string;
  displayValue: string;
}

export interface EspnBoxScoreTeam {
  team: Pick<EspnTeamRef, 'id' | 'abbreviation'>;
  statistics: EspnBoxScoreStat[];
}

export interface EspnPlayerStatItem {
  name: string;
  displayValue: string;
}

export interface EspnPlayerAthlete {
  id: string;
  displayName: string;
  /** Not present in summary box scores — fall back to displayName */
  shortName?: string;
  firstName?: string;
  lastName?: string;
}

export interface EspnPlayerStatRow {
  athlete: EspnPlayerAthlete;
  stats: string[];  // positional values matching the header labels
}

export interface EspnPlayerStatCategory {
  name: string;  // "passing" | "rushing" | "receiving" | "defensive" | "kicking" | ...
  labels: string[];
  athletes: EspnPlayerStatRow[];
  totals?: string[];  // team totals matching labels
}

export interface EspnBoxScorePlayerTeam {
  team: Pick<EspnTeamRef, 'id' | 'abbreviation'>;
  statistics: EspnPlayerStatCategory[];
}

// ── Roster ────────────────────────────────────────────────────────────────

export interface EspnRosterAthlete {
  id: string;
  fullName: string;
  displayName: string;
  jersey?: string;
  position: { abbreviation: string; displayName: string; };
}

export interface EspnRosterGroup {
  position: string;  // "offense" | "defense" | "specialTeam" | "injuredReserveOrOut" | ...
  items: EspnRosterAthlete[];
}

export interface EspnRosterResponse {
  athletes: EspnRosterGroup[];
}

// ── Team season statistics ─────────────────────────────────────────────────

export interface EspnTeamStatItem {
  name: string;
  displayName: string;
  displayValue: string;
  perGameDisplayValue?: string;
}

export interface EspnTeamStatCategory {
  name: string;  // "passing" | "rushing" | "defensive" | "scoring" | "miscellaneous" | ...
  stats: EspnTeamStatItem[];
}

export interface EspnTeamStatsResponse {
  results: {
    stats: { categories: EspnTeamStatCategory[] };
  };
}

export interface EspnSummaryResponse {
  boxscore?: {
    teams?: EspnBoxScoreTeam[];
    players?: EspnBoxScorePlayerTeam[];
  };
  header?: {
    competitions?: EspnCompetition[];
  };
}
