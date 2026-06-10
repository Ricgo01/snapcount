import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getStoredGame } from '@/lib/services/history';
import { Icon } from '@/components/ui/Icon';
import { GameBanner } from '@/components/game/GameBanner';
import { GameTabs } from '@/components/game/GameTabs';
import { getGameDetail } from '@/lib/services/game-detail';
import { getHeadToHead } from '@/lib/services/history';
import { getTeam } from '@/lib/data';
import Link from 'next/link';

interface Props { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const game = await getStoredGame(id);
  if (!game) return { title: 'Partido NFL' };
  const away = getTeam(game.awayId);
  const home = getTeam(game.homeId);
  if (!away || !home) return { title: 'Partido NFL' };
  const score = game.status === 'final' ? ` (${game.awayScore}-${game.homeScore})` : '';
  return {
    title: `${away.name} vs ${home.name}${score} · Semana ${game.week} ${game.season}`,
    description: `Marcador, estadísticas por equipo y jugadores, y enfrentamientos previos del ${away.city} ${away.name} vs ${home.city} ${home.name} de la Semana ${game.week}, temporada ${game.season} de la NFL.`,
  };
}

export default async function GamePage({ params }: Props) {
  const { id } = await params;
  const detail = await getGameDetail(id);
  if (!detail) notFound();

  const { game, teamStats, playerStats } = detail;
  const away = getTeam(game.awayId);
  const home = getTeam(game.homeId);
  if (!away || !home) notFound();

  const headToHead = (await getHeadToHead(game.awayId, game.homeId))
    .filter(g => g.id !== game.id);

  return (
    <div className="screen screen-detail">
      <Link href="/season" className="detail-back"><Icon name="back" size={18} />Volver</Link>
      <GameBanner game={game} away={away} home={home} />
      <GameTabs
        game={game} away={away} home={home}
        teamStats={teamStats}
        playerStats={playerStats}
        headToHead={headToHead}
      />
    </div>
  );
}
