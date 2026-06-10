import type { Team, Conference, Division, GameDay } from '@/types/nfl';

export const TEAMS: Team[] = [
  // AFC East
  { id: "BUF", city: "Buffalo", name: "Bills", conf: "AFC", div: "East", primary: "#00338D", secondary: "#C60C30", stadium: "Highmark Stadium" },
  { id: "MIA", city: "Miami", name: "Dolphins", conf: "AFC", div: "East", primary: "#008E97", secondary: "#FC4C02", stadium: "Hard Rock Stadium" },
  { id: "NE",  city: "New England", name: "Patriots", conf: "AFC", div: "East", primary: "#0A2342", secondary: "#C60C30", stadium: "Gillette Stadium", banner: "/logos/NE-banner.svg" },
  { id: "NYJ", city: "New York", name: "Jets", conf: "AFC", div: "East", primary: "#125740", secondary: "#1A1A1A", stadium: "MetLife Stadium" },
  // AFC North
  { id: "BAL", city: "Baltimore", name: "Ravens", conf: "AFC", div: "North", primary: "#241773", secondary: "#9E7C0C", stadium: "M&T Bank Stadium" },
  { id: "CIN", city: "Cincinnati", name: "Bengals", conf: "AFC", div: "North", primary: "#FB4F14", secondary: "#1A1A1A", stadium: "Paycor Stadium" },
  { id: "CLE", city: "Cleveland", name: "Browns", conf: "AFC", div: "North", primary: "#4B2E11", secondary: "#FF3C00", stadium: "Huntington Bank Field" },
  { id: "PIT", city: "Pittsburgh", name: "Steelers", conf: "AFC", div: "North", primary: "#1A1A1A", secondary: "#FFB612", stadium: "Acrisure Stadium" },
  // AFC South
  { id: "HOU", city: "Houston", name: "Texans", conf: "AFC", div: "South", primary: "#03202F", secondary: "#A71930", stadium: "NRG Stadium" },
  { id: "IND", city: "Indianapolis", name: "Colts", conf: "AFC", div: "South", primary: "#002C5F", secondary: "#A2AAAD", stadium: "Lucas Oil Stadium" },
  { id: "JAX", city: "Jacksonville", name: "Jaguars", conf: "AFC", div: "South", primary: "#0F4C5C", secondary: "#D7A22A", stadium: "EverBank Stadium" },
  { id: "TEN", city: "Tennessee", name: "Titans", conf: "AFC", div: "South", primary: "#0C2340", secondary: "#4B92DB", stadium: "Nissan Stadium" },
  // AFC West
  { id: "DEN", city: "Denver", name: "Broncos", conf: "AFC", div: "West", primary: "#0A2244", secondary: "#FB4F14", stadium: "Empower Field" },
  { id: "KC",  city: "Kansas City", name: "Chiefs", conf: "AFC", div: "West", primary: "#E31837", secondary: "#FFB81C", stadium: "Arrowhead Stadium" },
  { id: "LV",  city: "Las Vegas", name: "Raiders", conf: "AFC", div: "West", primary: "#1A1A1A", secondary: "#A5ACAF", stadium: "Allegiant Stadium" },
  { id: "LAC", city: "Los Angeles", name: "Chargers", conf: "AFC", div: "West", primary: "#0080C6", secondary: "#FFC20E", stadium: "SoFi Stadium" },
  // NFC East
  { id: "DAL", city: "Dallas", name: "Cowboys", conf: "NFC", div: "East", primary: "#003594", secondary: "#869397", stadium: "AT&T Stadium" },
  { id: "NYG", city: "New York", name: "Giants", conf: "NFC", div: "East", primary: "#0B2265", secondary: "#A71930", stadium: "MetLife Stadium" },
  { id: "PHI", city: "Philadelphia", name: "Eagles", conf: "NFC", div: "East", primary: "#004C54", secondary: "#A5ACAF", stadium: "Lincoln Financial Field" },
  { id: "WAS", city: "Washington", name: "Commanders", conf: "NFC", div: "East", primary: "#5A1414", secondary: "#FFB612", stadium: "Northwest Stadium" },
  // NFC North
  { id: "CHI", city: "Chicago", name: "Bears", conf: "NFC", div: "North", primary: "#0B162A", secondary: "#C83803", stadium: "Soldier Field" },
  { id: "DET", city: "Detroit", name: "Lions", conf: "NFC", div: "North", primary: "#0076B6", secondary: "#B0B7BC", stadium: "Ford Field" },
  { id: "GB",  city: "Green Bay", name: "Packers", conf: "NFC", div: "North", primary: "#203731", secondary: "#FFB612", stadium: "Lambeau Field" },
  { id: "MIN", city: "Minnesota", name: "Vikings", conf: "NFC", div: "North", primary: "#4F2683", secondary: "#FFC62F", stadium: "U.S. Bank Stadium" },
  // NFC South
  { id: "ATL", city: "Atlanta", name: "Falcons", conf: "NFC", div: "South", primary: "#A71930", secondary: "#1A1A1A", stadium: "Mercedes-Benz Stadium" },
  { id: "CAR", city: "Carolina", name: "Panthers", conf: "NFC", div: "South", primary: "#0085CA", secondary: "#1A1A1A", stadium: "Bank of America Stadium" },
  { id: "NO",  city: "New Orleans", name: "Saints", conf: "NFC", div: "South", primary: "#9F8958", secondary: "#1A1A1A", stadium: "Caesars Superdome" },
  { id: "TB",  city: "Tampa Bay", name: "Buccaneers", conf: "NFC", div: "South", primary: "#D50A0A", secondary: "#34302B", stadium: "Raymond James Stadium" },
  // NFC West
  { id: "ARI", city: "Arizona", name: "Cardinals", conf: "NFC", div: "West", primary: "#97233F", secondary: "#1A1A1A", stadium: "State Farm Stadium" },
  { id: "LAR", city: "Los Angeles", name: "Rams", conf: "NFC", div: "West", primary: "#003594", secondary: "#FFA300", stadium: "SoFi Stadium" },
  { id: "SF",  city: "San Francisco", name: "49ers", conf: "NFC", div: "West", primary: "#AA0000", secondary: "#B3995D", stadium: "Levi's Stadium" },
  { id: "SEA", city: "Seattle", name: "Seahawks", conf: "NFC", div: "West", primary: "#002244", secondary: "#69BE28", stadium: "Lumen Field" },
];

export const TEAM_BY_ID: Record<string, Team> = Object.fromEntries(TEAMS.map((t) => [t.id, t]));
export const getTeam = (id: string): Team | undefined => TEAM_BY_ID[id];
export const fullName = (t: Team): string => `${t.city} ${t.name}`;

export const CONFERENCES: Conference[] = ["AFC", "NFC"];
export const DIVISIONS: Division[] = ["North", "South", "East", "West"];
export const DAYS: GameDay[] = ["Jue", "Dom", "Lun"];
export const DAY_FULL: Record<GameDay, string> = { Jue: "Jueves", Dom: "Domingo", Lun: "Lunes" };

// All seasons with game history (Supabase backfill + ESPN date ranges).
// 2002 = first Texans season; all 32 current franchises exist from there.
export const SEASONS = Array.from({ length: 2026 - 2002 + 1 }, (_, i) => {
  const y = 2026 - i;
  return `${y}-${String((y + 1) % 100).padStart(2, "0")}`;
});
export const CURRENT_SEASON = "2026-27";
export const TOTAL_WEEKS = 18;
