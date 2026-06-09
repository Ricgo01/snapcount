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
  score?: string;
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
  shortName: string;
}

export interface EspnPlayerStatRow {
  athlete: EspnPlayerAthlete;
  stats: string[];  // positional values matching the header labels
}

export interface EspnPlayerStatCategory {
  name: string;  // "passing" | "rushing" | "receiving"
  labels: string[];
  athletes: EspnPlayerStatRow[];
}

export interface EspnBoxScorePlayerTeam {
  team: Pick<EspnTeamRef, 'id' | 'abbreviation'>;
  statistics: EspnPlayerStatCategory[];
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
