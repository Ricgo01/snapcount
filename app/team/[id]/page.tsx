import { notFound } from 'next/navigation';
import { Icon } from '@/components/ui/Icon';
import { TeamBanner } from '@/components/team/TeamBanner';
import { TeamTabs } from '@/components/team/TeamTabs';
import { getTeamDetail } from '@/lib/services/team-detail';
import { CURRENT_SEASON } from '@/lib/data';
import Link from 'next/link';

interface Props { params: Promise<{ id: string }>; searchParams: Promise<{ season?: string }> }

export default async function TeamPage({ params, searchParams }: Props) {
  const { id }  = await params;
  const sp      = await searchParams;
  const season  = sp.season ?? CURRENT_SEASON;
  const detail  = await getTeamDetail(id, season);
  if (!detail) notFound();

  const { team, record, recordStr, games } = detail;
  return (
    <div className="screen screen-detail">
      <Link href="/teams" className="detail-back"><Icon name="back" size={18} />Volver</Link>
      <TeamBanner team={team} record={record} recordStr={recordStr} season={season} />
      <TeamTabs team={team} games={games} record={record} recordStr={recordStr} season={season} />
    </div>
  );
}
