import { Header } from '@/components/ui/Header';
import { ConferenceColumn } from '@/components/teams/ConferenceColumn';
import { getStandings } from '@/lib/services/standings';
import { CURRENT_SEASON } from '@/lib/data';

interface Props { searchParams: Promise<{ season?: string }> }

export default async function TeamsPage({ searchParams }: Props) {
  const params  = await searchParams;
  const season  = params.season ?? CURRENT_SEASON;
  const standings = await getStandings(season);

  return (
    <div className="screen">
      <Header title="Teams" subtitle="Tabla de posiciones por conferencia y división" />
      <div className="conf-grid">
        {standings.map(s => (
          <ConferenceColumn key={s.conf} conf={s.conf as 'AFC' | 'NFC'} divisions={s.divisions} />
        ))}
      </div>
    </div>
  );
}
