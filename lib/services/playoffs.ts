import { espnFetch } from '@/lib/espn/client';
import { espnUrls, seasonToYear, playoffDateRange, CURRENT_ESPN_YEAR, type PlayoffRound } from '@/lib/espn/endpoints';
import { espnEventToGame, normalizeAbbr } from '@/lib/espn/transform';
import { playoffPicture, getTeam, CURRENT_SEASON } from '@/lib/data';
import type { EspnScoreboardResponse, EspnEvent, EspnCompetitor } from '@/lib/espn/types';
import type { PlayoffPicture, PlayoffSeed, PlayoffMatchup, ConferenceBracket, Game } from '@/types/nfl';

// ESPN playoff week numbers (seasontype=3) — only valid for the current season
const PO_WEEKS: Record<PlayoffRound, number> = { wildCard: 1, divisional: 2, confFinals: 3, superBowl: 5 };
const PO_ROUNDS: PlayoffRound[] = ['wildCard', 'divisional', 'confFinals', 'superBowl'];

interface PlayoffRoundGames {
  wildCard:   EspnEvent[];
  divisional: EspnEvent[];
  confFinals: EspnEvent[];
  superBowl:  EspnEvent[];
}

async function fetchPlayoffRound(year: number, round: PlayoffRound): Promise<EspnEvent[]> {
  let url: string;
  if (year === CURRENT_ESPN_YEAR) {
    url = `${espnUrls.scoreboard(PO_WEEKS[round], year)}&seasontype=3`;
  } else {
    // ESPN ignores `season` for historical playoff weeks — use date ranges
    const range = playoffDateRange(year, round);
    if (!range) return [];
    url = espnUrls.scoreboardByDates(range);
  }
  const raw = await espnFetch<EspnScoreboardResponse>(url, `espn-playoffs-${year}-${round}`, 3600);
  return (raw?.events ?? []).filter(e => {
    // Off-season, ESPN's week params serve the *previous* season's playoffs —
    // keep only events that actually belong to the requested year
    if (e.season?.year !== undefined && e.season.year !== year) return false;
    // Keep only games between two real NFL teams (drops the Pro Bowl)
    const comps = e.competitions?.[0]?.competitors ?? [];
    return comps.length === 2 && comps.every(c => getTeam(normalizeAbbr(c.team.abbreviation)));
  });
}

/** Determine which conference a team belongs to based on our static team data. */
function teamConf(abbr: string): 'AFC' | 'NFC' | null {
  return getTeam(normalizeAbbr(abbr))?.conf ?? null;
}

/** Convert ESPN event to a { winner, loser } pair (null if not finished). */
function gameWinner(event: EspnEvent): { winner: string; loser: string } | null {
  const comp = event.competitions?.[0];
  if (!comp || comp.status.type.state !== 'post') return null;
  const home = comp.competitors.find(c => c.homeAway === 'home');
  const away = comp.competitors.find(c => c.homeAway === 'away');
  if (!home || !away) return null;
  const hs = Number(home.score ?? 0);
  const as = Number(away.score ?? 0);
  const winnerAbbr  = normalizeAbbr((hs >= as ? home : away).team.abbreviation);
  const loserAbbr   = normalizeAbbr((hs >= as ? away : home).team.abbreviation);
  return { winner: winnerAbbr, loser: loserAbbr };
}

/** Numeric score from an ESPN competitor (string or object form). */
function competitorScore(c: EspnCompetitor | undefined): number | null {
  const raw = typeof c?.score === 'object' ? c.score.value : c?.score;
  const n = Number(raw);
  return raw !== undefined && raw !== '' && Number.isFinite(n) ? n : null;
}

/** Build a matchup (with scores when final) + winner from an ESPN event. */
function toMatchup(event: EspnEvent): { matchup: PlayoffMatchup; winner: PlayoffSeed | null } {
  const comp = event.competitions?.[0];
  const home = comp?.competitors.find(c => c.homeAway === 'home');
  const away = comp?.competitors.find(c => c.homeAway === 'away');
  const finished = comp?.status.type.state === 'post';

  // We use seed=0 as placeholder when we don't have seeding from ESPN
  const makeSeed = (abbr: string): PlayoffSeed => ({ seed: 0, id: normalizeAbbr(abbr) });

  const a: PlayoffSeed | null = away ? makeSeed(away.team.abbreviation) : null;
  const b: PlayoffSeed | null = home ? makeSeed(home.team.abbreviation) : null;
  const result = gameWinner(event);

  return {
    matchup: {
      a, b,
      aScore: finished ? competitorScore(away) : null,
      bScore: finished ? competitorScore(home) : null,
      gameId: event.id,
    },
    winner: result ? makeSeed(result.winner) : null,
  };
}

/**
 * Build a ConferenceBracket from ESPN playoff games for one conference.
 * Games are filtered by checking team conference membership.
 */
function buildConfBracket(
  conf: 'AFC' | 'NFC',
  rounds: PlayoffRoundGames,
): ConferenceBracket {
  // Filter games that belong to this conference (both teams in same conf, or 1 bye week)
  const confGames = (events: EspnEvent[]) =>
    events.filter(e => {
      const comp = e.competitions?.[0];
      const teams = comp?.competitors.map(c => normalizeAbbr(c.team.abbreviation)) ?? [];
      return teams.some(t => teamConf(t) === conf);
    });

  const wcGames   = confGames(rounds.wildCard);
  const divGames  = confGames(rounds.divisional);
  const cfGames   = confGames(rounds.confFinals);

  // Wild Card matchups
  const wild: PlayoffMatchup[]    = [];
  const wildW: PlayoffSeed[]       = [];
  for (const e of wcGames) {
    const { matchup, winner } = toMatchup(e);
    wild.push(matchup);
    if (winner) wildW.push(winner);
  }

  // Divisional matchups
  const divi: PlayoffMatchup[]    = [];
  const diviWin: PlayoffSeed[]    = [];
  for (const e of divGames) {
    const { matchup, winner } = toMatchup(e);
    divi.push(matchup);
    if (winner) diviWin.push(winner);
  }

  // Conference final
  const cfEvent  = cfGames[0];
  const cfResult = cfEvent ? toMatchup(cfEvent) : { matchup: { a: null, b: null }, winner: null };
  const champ    = cfResult.winner ?? { seed: 0, id: '' };

  return {
    seeds:    [],          // ESPN doesn't expose seeding directly in scoreboard
    bye:      { seed: 1, id: '' },
    wild,
    wildW,
    divi,
    diviWin,
    final:    cfResult.matchup,
    champ,
  };
}

/**
 * Fetch real playoff picture from ESPN for a given season.
 * - Current season with no playoff games played yet → mock projected bracket.
 * - Past season with no data (ESPN down) → null, callers show a fallback.
 */
export async function getPlayoffPicture(season = CURRENT_SEASON): Promise<PlayoffPicture | null> {
  const year = seasonToYear(season);

  const [wcEvents, divEvents, cfEvents, sbEvents] = await Promise.all(
    PO_ROUNDS.map(r => fetchPlayoffRound(year, r)),
  );

  const allGames  = [...wcEvents, ...divEvents, ...cfEvents, ...sbEvents];
  const anyPlayed = allGames.some(e => e.competitions?.[0]?.status.type.state === 'post');
  if (!anyPlayed) {
    // Current season: regular season ongoing → projected bracket. Past: no data.
    return year === CURRENT_ESPN_YEAR ? playoffPicture() : null;
  }

  const rounds: PlayoffRoundGames = {
    wildCard:   wcEvents,
    divisional: divEvents,
    confFinals: cfEvents,
    superBowl:  sbEvents,
  };

  const afc = buildConfBracket('AFC', rounds);
  const nfc = buildConfBracket('NFC', rounds);

  // Super Bowl — matchup oriented AFC (a) vs NFC (b), with scores
  const sbEvent  = sbEvents[0];
  const sbResult = sbEvent ? toMatchup(sbEvent) : null;
  const champ    = sbResult?.winner ?? afc.champ; // fallback to AFC conf champ

  let sb: PlayoffMatchup | undefined;
  if (sbResult) {
    const m = sbResult.matchup;
    sb = m.a && teamConf(m.a.id) === 'NFC'
      ? { a: m.b, b: m.a, aScore: m.bScore, bScore: m.aScore, gameId: m.gameId }
      : m;
  }

  return { afc, nfc, champ, sb, real: true };
}

/** Also export the raw playoff games as Game[] (for Season page bracket tab). */
export async function getPlayoffGames(season = CURRENT_SEASON): Promise<Game[]> {
  const year = seasonToYear(season);
  const games: Game[] = [];
  for (const round of PO_ROUNDS) {
    const events = await fetchPlayoffRound(year, round);
    for (const e of events) {
      const g = espnEventToGame(e, season);
      if (g) games.push(g);
    }
  }
  return games;
}
