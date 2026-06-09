/**
 * ESPN raw response → canonical types (Team, Game, TeamRecord, stats).
 * All functions are pure and throw-safe.
 */
import type { Game, GameDay, GameStatus, TeamRecord, GameStatsResult, PlayerStatsResult } from '@/types/nfl';
import type {
  EspnEvent, EspnCompetition, EspnStandingsEntry,
  EspnSummaryResponse, EspnBoxScoreTeam,
} from './types';

// ── Day/time helpers ───────────────────────────────────────────────────────

/** Derive the NFL GameDay from a UTC ISO date string using Eastern Time (UTC-4 during season). */
export function dateToGameDay(dateStr: string): GameDay {
  const utcMs = new Date(dateStr).getTime();
  // Approximate ET: UTC-4 (EDT, covers Sep-Nov and Jan playoff games)
  const etDate = new Date(utcMs - 4 * 60 * 60 * 1000);
  const dow = etDate.getUTCDay(); // 0=Sun, 1=Mon, ..., 4=Thu
  if (dow === 4) return 'Jue';
  if (dow === 1) return 'Lun';
  return 'Dom'; // Sun (and rare Sat late-season games)
}

/** Format an ISO date string to "HH:MM" in ET. */
export function dateToTimeET(dateStr: string): string {
  const utcMs = new Date(dateStr).getTime();
  const etDate = new Date(utcMs - 4 * 60 * 60 * 1000);
  const h = etDate.getUTCHours();
  const m = etDate.getUTCMinutes();
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// ── Status mapping ─────────────────────────────────────────────────────────

const STATUS_MAP: Record<string, GameStatus> = {
  STATUS_SCHEDULED:    'scheduled',
  STATUS_IN_PROGRESS:  'live',
  STATUS_HALFTIME:     'live',
  STATUS_FINAL:        'final',
  STATUS_FINAL_OT:     'final',
  STATUS_POSTPONED:    'scheduled',
  STATUS_SUSPENDED:    'scheduled',
  STATUS_CANCELED:     'scheduled',
  STATUS_DELAYED:      'scheduled',
};

function toGameStatus(espnName: string): GameStatus {
  return STATUS_MAP[espnName] ?? 'scheduled';
}

// ── Abbreviation normalization ─────────────────────────────────────────────
// ESPN uses different abbreviations for some teams vs our canonical IDs.
const ABBR_NORM: Record<string, string> = {
  WSH: 'WAS',   // Washington Commanders
  JAC: 'JAX',   // Jacksonville Jaguars
  LA:  'LAR',   // Los Angeles Rams
  SD:  'LAC',   // (legacy San Diego Chargers)
  OAK: 'LV',    // (legacy Oakland Raiders)
  STL: 'LAR',   // (legacy St. Louis Rams)
};

function normalizeAbbr(abbr: string): string {
  return ABBR_NORM[abbr] ?? abbr;
}

// ── Event → Game ───────────────────────────────────────────────────────────

export function espnEventToGame(event: EspnEvent, season: string): Game | null {
  const comp: EspnCompetition | undefined = event.competitions?.[0];
  if (!comp) return null;

  const homeComp = comp.competitors.find(c => c.homeAway === 'home');
  const awayComp = comp.competitors.find(c => c.homeAway === 'away');
  if (!homeComp || !awayComp) return null;

  const status = toGameStatus(comp.status.type.name);
  const isLive  = status === 'live';
  const isFinal = status === 'final';

  return {
    id:       event.id,          // ESPN event ID used as our primary ID
    espnId:   event.id,
    week:     event.week?.number ?? 1,
    day:      dateToGameDay(comp.date),
    time:     dateToTimeET(comp.date),
    season,
    homeId:   normalizeAbbr(homeComp.team.abbreviation),
    awayId:   normalizeAbbr(awayComp.team.abbreviation),
    stadium:  comp.venue?.fullName ?? 'TBD',
    status,
    homeScore: isFinal || isLive ? Number(homeComp.score ?? 0) : null,
    awayScore: isFinal || isLive ? Number(awayComp.score ?? 0) : null,
    quarter:  isLive ? (comp.status.period || null) : null,
    clock:    isLive ? (comp.status.displayClock || null) : null,
  };
}

// ── Standings entry → TeamRecord ───────────────────────────────────────────

export function espnStandingsEntryToRecord(entry: EspnStandingsEntry): TeamRecord {
  const get = (name: string) =>
    entry.stats.find(s => s.name === name)?.value ?? 0;
  return {
    w:  get('wins'),
    l:  get('losses'),
    t:  get('ties'),
    pf: get('pointsFor'),
    pa: get('pointsAgainst'),
  };
}

// ── Box score → team stats ─────────────────────────────────────────────────

function statVal(team: EspnBoxScoreTeam, name: string): string {
  return team.statistics?.find(s => s.name === name)?.displayValue ?? '0';
}

export function espnBoxScoreToTeamStats(
  summaryRes: EspnSummaryResponse,
  homeAbbr: string,
  awayAbbr: string,
): GameStatsResult | null {
  const teams = summaryRes.boxscore?.teams;
  if (!teams?.length) return null;

  const homeTeam = teams.find(t => t.team.abbreviation === homeAbbr);
  const awayTeam = teams.find(t => t.team.abbreviation === awayAbbr);
  if (!homeTeam || !awayTeam) return null;

  const toStats = (t: EspnBoxScoreTeam) => ({
    yards: Number(statVal(t, 'totalYards'))   || 0,
    pass:  Number(statVal(t, 'passingYards')) || 0,
    rush:  Number(statVal(t, 'rushingYards')) || 0,
    first: Number(statVal(t, 'firstDowns'))   || 0,
    poss:  statVal(t, 'possessionTime'),
    turn:  Number(statVal(t, 'turnovers'))    || 0,
    third: statVal(t, 'thirdDownEff'),
  });

  return { home: toStats(homeTeam), away: toStats(awayTeam) };
}

// ── Box score → player stats ───────────────────────────────────────────────

export function espnBoxScoreToPlayerStats(
  summaryRes: EspnSummaryResponse,
  homeAbbr: string,
  awayAbbr: string,
): PlayerStatsResult | null {
  const playerTeams = summaryRes.boxscore?.players;
  if (!playerTeams?.length) return null;

  const homeData = playerTeams.find(t => t.team.abbreviation === homeAbbr);
  const awayData = playerTeams.find(t => t.team.abbreviation === awayAbbr);
  if (!homeData || !awayData) return null;

  const parseTeam = (teamData: typeof homeData) => {
    const getCat = (name: string) =>
      teamData.statistics.find(s => s.name === name);

    const passingCat = getCat('passing');
    const rushingCat = getCat('rushing');
    const receivingCat = getCat('receiving');

    // Helper: find label index
    const idx = (labels: string[], label: string) => labels.indexOf(label);

    const passing = (passingCat?.athletes ?? []).slice(0, 1).map(a => {
      const s = a.stats;
      const lbls = passingCat!.labels;
      return {
        name: a.athlete.shortName,
        line: s[idx(lbls, 'C/ATT')] ?? s[0] ?? '0/0',
        yds:  Number(s[idx(lbls, 'YDS')] ?? 0),
        td:   Number(s[idx(lbls, 'TD')]  ?? 0),
        int:  Number(s[idx(lbls, 'INT')] ?? 0),
      };
    });

    const rushing = (rushingCat?.athletes ?? []).slice(0, 2).map(a => {
      const s = a.stats;
      const lbls = rushingCat!.labels;
      return {
        name: a.athlete.shortName,
        car:  Number(s[idx(lbls, 'CAR')] ?? 0),
        yds:  Number(s[idx(lbls, 'YDS')] ?? 0),
        td:   Number(s[idx(lbls, 'TD')]  ?? 0),
      };
    });

    const receiving = (receivingCat?.athletes ?? []).slice(0, 3).map(a => {
      const s = a.stats;
      const lbls = receivingCat!.labels;
      return {
        name: a.athlete.shortName,
        rec:  Number(s[idx(lbls, 'REC')] ?? 0),
        yds:  Number(s[idx(lbls, 'YDS')] ?? 0),
        td:   Number(s[idx(lbls, 'TD')]  ?? 0),
      };
    });

    return { passing, rushing, receiving };
  };

  return { home: parseTeam(homeData), away: parseTeam(awayData) };
}
