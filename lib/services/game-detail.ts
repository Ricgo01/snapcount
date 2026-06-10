import { espnFetch } from '@/lib/espn/client';
import { espnUrls } from '@/lib/espn/endpoints';
import { espnEventToGame, espnBoxScoreToTeamStats, espnBoxScoreToPlayerStats } from '@/lib/espn/transform';
import { GAMES, teamStats as mockTeamStats, playerStats as mockPlayerStats, CURRENT_SEASON } from '@/lib/data';
import { getStoredGame } from './history';
import { getStoredGameStats, storeGameStats } from './game-stats';
import type { EspnSummaryResponse } from '@/lib/espn/types';
import type { Game, GameStatsResult, PlayerStatsResult } from '@/types/nfl';

export interface GameDetail {
  game: Game;
  teamStats: GameStatsResult | null;
  playerStats: PlayerStatsResult | null;
}

/**
 * Fetch full game detail (box score, stats) by ESPN event ID or mock ID.
 * Falls back to mock data when ESPN is unavailable.
 */
export async function getGameDetail(id: string): Promise<GameDetail | null> {
  // Determine if this is an ESPN numeric ID or our mock "w{week}-{away}-{home}" format
  const isEspnId = /^\d+$/.test(id);

  if (isEspnId) {
    return getGameDetailFromEspn(id);
  }

  // Mock ID path
  return getGameDetailFromMock(id);
}

async function getGameDetailFromEspn(eventId: string): Promise<GameDetail | null> {
  // Cache-aside: stored game + stats first (also gives the real week/season,
  // which ESPN's summary header doesn't expose for historical games)
  const [storedGame, storedStats] = await Promise.all([
    getStoredGame(eventId),
    getStoredGameStats(eventId),
  ]);

  if (storedGame?.status === 'final' && storedStats) {
    return {
      game: storedGame,
      teamStats: storedStats.teamStats,
      playerStats: storedStats.playerStats,
    };
  }

  const raw = await espnFetch<EspnSummaryResponse>(
    espnUrls.summary(eventId),
    `espn-game-${eventId}`,
  );

  if (!raw) {
    // ESPN down — serve whatever is stored
    if (!storedGame) return null;
    return {
      game: storedGame,
      teamStats: storedStats?.teamStats ?? null,
      playerStats: storedStats?.playerStats ?? null,
    };
  }

  // Try to reconstruct the Game object from the summary header
  const competition = raw.header?.competitions?.[0];
  if (!competition) return null;

  const homeComp = competition.competitors.find(c => c.homeAway === 'home');
  const awayComp = competition.competitors.find(c => c.homeAway === 'away');
  if (!homeComp || !awayComp) return null;

  const homeAbbr = homeComp.team.abbreviation;
  const awayAbbr = awayComp.team.abbreviation;

  // Synthesize a Game object from the competition data
  const fakeEvent = {
    id: eventId,
    name: `${awayComp.team.displayName} at ${homeComp.team.displayName}`,
    shortName: `${awayAbbr} @ ${homeAbbr}`,
    week: undefined,
    season: undefined,
    competitions: [competition],
  };

  const espnGame = espnEventToGame(fakeEvent, CURRENT_SEASON);
  if (!espnGame) return null;

  // The summary header lacks week/season — take them from the stored game
  const game: Game = storedGame
    ? { ...espnGame, week: storedGame.week, season: storedGame.season }
    : espnGame;

  const hasScore = game.status !== 'scheduled';
  const tStats = hasScore
    ? espnBoxScoreToTeamStats(raw, homeAbbr, awayAbbr)
    : null;
  const pStats = hasScore
    ? espnBoxScoreToPlayerStats(raw, homeAbbr, awayAbbr)
    : null;

  // Persist for next visits once the game is final
  if (game.status === 'final' && (tStats || pStats)) {
    await storeGameStats(eventId, tStats, pStats).catch(err =>
      console.warn('[game-detail] failed to store stats:', err),
    );
  }

  return {
    game,
    teamStats: tStats,
    playerStats: pStats,
  };
}

async function getGameDetailFromMock(id: string): Promise<GameDetail | null> {
  const game = GAMES.find(g => g.id === id);
  if (!game) return null;

  const hasScore = game.status !== 'scheduled';
  return {
    game,
    teamStats: hasScore ? mockTeamStats(game) : null,
    playerStats: hasScore ? mockPlayerStats(game) : null,
  };
}
