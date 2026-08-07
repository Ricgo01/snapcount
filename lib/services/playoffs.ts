import { seasonToYear } from '@/lib/espn/endpoints';
import { getPlayoffGames } from './history';
import type { GameRow } from './history';
import { getTeam, CURRENT_SEASON } from '@/lib/data';
import type { PlayoffPicture, PlayoffSeed, PlayoffMatchup, ConferenceBracket } from '@/types/nfl';

type PlayoffRound = 'wildCard' | 'divisional' | 'confFinals' | 'superBowl';
const ROUNDS: PlayoffRound[] = ['wildCard', 'divisional', 'confFinals', 'superBowl'];

interface PlayoffRoundGames {
  wildCard:   GameRow[];
  divisional: GameRow[];
  confFinals: GameRow[];
  superBowl:  GameRow[];
}

/** Determine which conference a team belongs to based on our static team data. */
function teamConf(abbr: string): 'AFC' | 'NFC' | null {
  return getTeam(abbr)?.conf ?? null;
}

/** Convert a stored game row to a { winner, loser } pair (null if not finished). */
function gameWinner(row: GameRow): { winner: string; loser: string } | null {
  if (row.status !== 'final' || row.home_score === null || row.away_score === null) return null;
  const homeWon = row.home_score >= row.away_score;
  return {
    winner: homeWon ? row.home_team : row.away_team,
    loser:  homeWon ? row.away_team : row.home_team,
  };
}

/** Build a matchup (with scores when final) + winner from a stored game row. */
function toMatchup(row: GameRow): { matchup: PlayoffMatchup; winner: PlayoffSeed | null } {
  const finished = row.status === 'final';
  // We use seed=0 as placeholder — we don't store bracket seeding, same as before.
  const makeSeed = (abbr: string): PlayoffSeed => ({ seed: 0, id: abbr });
  const result = gameWinner(row);

  return {
    matchup: {
      a: makeSeed(row.away_team),
      b: makeSeed(row.home_team),
      aScore: finished ? row.away_score : null,
      bScore: finished ? row.home_score : null,
      gameId: row.id,
    },
    winner: result ? makeSeed(result.winner) : null,
  };
}

/**
 * Build a ConferenceBracket from stored playoff games for one conference.
 * Games are filtered by checking team conference membership.
 */
function buildConfBracket(
  conf: 'AFC' | 'NFC',
  rounds: PlayoffRoundGames,
): ConferenceBracket {
  const confGames = (rows: GameRow[]) =>
    rows.filter(r => teamConf(r.home_team) === conf || teamConf(r.away_team) === conf);

  const wcGames  = confGames(rounds.wildCard);
  const divGames = confGames(rounds.divisional);
  const cfGames  = confGames(rounds.confFinals);

  // Wild Card matchups
  const wild: PlayoffMatchup[] = [];
  const wildW: PlayoffSeed[]   = [];
  for (const r of wcGames) {
    const { matchup, winner } = toMatchup(r);
    wild.push(matchup);
    if (winner) wildW.push(winner);
  }

  // Divisional matchups
  const divi: PlayoffMatchup[] = [];
  const diviWin: PlayoffSeed[] = [];
  for (const r of divGames) {
    const { matchup, winner } = toMatchup(r);
    divi.push(matchup);
    if (winner) diviWin.push(winner);
  }

  // Conference final
  const cfRow    = cfGames[0];
  const cfResult = cfRow ? toMatchup(cfRow) : { matchup: { a: null, b: null }, winner: null };
  const champ    = cfResult.winner ?? { seed: 0, id: '' };

  return {
    seeds:    [],          // we don't store bracket seeding
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
 * Playoff picture for a season, built from our own stored games (kept fresh
 * by the nflverse-backed cron). Round is derived from `week`: for 18-week
 * regular seasons (2021+) weeks 19-22 are WC/DIV/CON/SB in order; for
 * 17-week seasons (pre-2021) it's weeks 18-21.
 * Returns null when that season's playoffs haven't been played (or nothing
 * is stored yet) — callers decide the fallback; never fake data.
 */
export async function getPlayoffPicture(season = CURRENT_SEASON): Promise<PlayoffPicture | null> {
  const year = seasonToYear(season);
  const rsWeeks = year >= 2021 ? 18 : 17;

  const rows = await getPlayoffGames(year);
  if (!rows.length) return null;

  const byRound: PlayoffRoundGames = { wildCard: [], divisional: [], confFinals: [], superBowl: [] };
  for (const row of rows) {
    const round = ROUNDS[row.week - rsWeeks - 1];
    if (round) byRound[round].push(row);
  }

  const anyPlayed = rows.some(r => r.status === 'final');
  if (!anyPlayed) return null;

  const afc = buildConfBracket('AFC', byRound);
  const nfc = buildConfBracket('NFC', byRound);

  // Super Bowl — matchup oriented AFC (a) vs NFC (b), with scores
  const sbRow    = byRound.superBowl[0];
  const sbResult = sbRow ? toMatchup(sbRow) : null;
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
