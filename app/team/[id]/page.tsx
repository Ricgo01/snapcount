import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getTeam } from '@/lib/data';
import { Icon } from '@/components/ui/Icon';
import { TeamBanner } from '@/components/team/TeamBanner';
import { TeamTabs } from '@/components/team/TeamTabs';
import { getTeamDetail } from '@/lib/services/team-detail';
import { getDepthChart } from '@/lib/services/depth-chart';
import { getPlayoffPicture } from '@/lib/services/playoffs';
import { CURRENT_SEASON } from '@/lib/data';
import Link from 'next/link';

interface Props { params: Promise<{ id: string }>; searchParams: Promise<{ season?: string }> }

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { id } = await params;
  const sp     = await searchParams;
  const season = sp.season ?? CURRENT_SEASON;
  const team   = getTeam(id);
  if (!team) return { title: 'Equipo no encontrado' };
  return {
    title: `${team.city} ${team.name} · resultados, roster y stats ${season}`,
    description: `Calendario, resultados, récord, depth chart y playoffs de ${team.city} ${team.name} (${team.id}) en la temporada ${season} de la NFL. Historial desde 2002.`,
  };
}

export default async function TeamPage({ params, searchParams }: Props) {
  const { id }  = await params;
  const sp      = await searchParams;
  const season  = sp.season ?? CURRENT_SEASON;
  const [detail, depthChart, playoffs] = await Promise.all([
    getTeamDetail(id, season),
    getDepthChart(id, season),
    getPlayoffPicture(season),
  ]);
  if (!detail) notFound();

  const { team, record, recordStr, games, seasonStats } = detail;
  return (
    <div className="screen screen-detail">
      <Link href="/teams" className="detail-back"><Icon name="back" size={18} />Volver</Link>
      <TeamBanner team={team} record={record} recordStr={recordStr} season={season} />
      <TeamTabs team={team} games={games}
        season={season} seasonStats={seasonStats} depthChart={depthChart} playoffs={playoffs} />
    </div>
  );
}
