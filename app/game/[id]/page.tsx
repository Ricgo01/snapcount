import { notFound } from 'next/navigation';
import { Icon } from '@/components/ui/Icon';
import { GameBanner } from '@/components/game/GameBanner';
import { GameTabs } from '@/components/game/GameTabs';
import { getGameDetail } from '@/lib/services/game-detail';
import { getTeam } from '@/lib/data';
import Link from 'next/link';

interface Props { params: Promise<{ id: string }> }

export default async function GamePage({ params }: Props) {
  const { id } = await params;
  const detail = await getGameDetail(id);
  if (!detail) notFound();

  const { game, chronicle, teamStats, playerStats } = detail;
  const away = getTeam(game.awayId);
  const home = getTeam(game.homeId);
  if (!away || !home) notFound();

  return (
    <div className="screen screen-detail">
      <Link href="/season" className="detail-back"><Icon name="back" size={18} />Volver</Link>
      <GameBanner game={game} away={away} home={home} />
      <GameTabs
        game={game} away={away} home={home}
        chronicle={chronicle}
        teamStats={teamStats}
        playerStats={playerStats}
      />
    </div>
  );
}
