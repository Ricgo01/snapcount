import { espnFetch } from '@/lib/espn/client';
import { espnUrls } from '@/lib/espn/endpoints';
import { espnEventToGame, espnBoxScoreToTeamStats, espnBoxScoreToPlayerStats } from '@/lib/espn/transform';
import { GAMES, getTeam, chronicle, teamStats as mockTeamStats, playerStats as mockPlayerStats, CURRENT_SEASON } from '@/lib/data';
import type { EspnSummaryResponse } from '@/lib/espn/types';
import type { Game, GameStatsResult, PlayerStatsResult } from '@/types/nfl';

export interface GameDetail {
  game: Game;
  chronicle: string;
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
  const raw = await espnFetch<EspnSummaryResponse>(
    espnUrls.summary(eventId),
    `espn-game-${eventId}`,
  );

  if (!raw) return null;

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

  const game = espnEventToGame(fakeEvent, CURRENT_SEASON);
  if (!game) return null;

  const hasScore = game.status !== 'scheduled';
  const tStats = hasScore
    ? espnBoxScoreToTeamStats(raw, homeAbbr, awayAbbr)
    : null;
  const pStats = hasScore
    ? espnBoxScoreToPlayerStats(raw, homeAbbr, awayAbbr)
    : null;

  return {
    game,
    chronicle: generateChronicle(game),
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
    chronicle: chronicle(game),
    teamStats: hasScore ? mockTeamStats(game) : null,
    playerStats: hasScore ? mockPlayerStats(game) : null,
  };
}

/** Generates a simple narrative for an ESPN game (no real text available in MVP 1). */
function generateChronicle(game: Game): string {
  const home = getTeam(game.homeId);
  const away = getTeam(game.awayId);
  if (!home || !away) return '';

  if (game.status === 'live') {
    return `Partido en desarrollo en ${game.stadium}. ${away.city} ${away.name} visita a ${home.city} ${home.name} en un duelo de la Semana ${game.week}. El marcador va ${game.awayScore}-${game.homeScore} en el ${game.quarter}º cuarto, con ${game.clock} por jugar.`;
  }
  if (game.status === 'final') {
    const winner = (game.homeScore ?? 0) > (game.awayScore ?? 0) ? home : away;
    const loser  = winner === home ? away : home;
    const ws = Math.max(game.homeScore ?? 0, game.awayScore ?? 0);
    const ls = Math.min(game.homeScore ?? 0, game.awayScore ?? 0);
    return `${winner.city} ${winner.name} se impuso ${ws}-${ls} ante ${loser.city} ${loser.name} en ${game.stadium}. Un encuentro de la Semana ${game.week} que se definió en los detalles.`;
  }
  return `${away.city} ${away.name} visita a ${home.city} ${home.name} en ${game.stadium} por la Semana ${game.week}. Programado para el ${game.day} a las ${game.time}.`;
}
