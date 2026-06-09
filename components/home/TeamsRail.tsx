import Link from 'next/link';
import { TeamLogo } from '@/components/ui/TeamLogo';
import type { Team } from '@/types/nfl';

interface Props { teams: Team[]; }

export function TeamsRail({ teams }: Props) {
  return (
    <div className="teams-rail">
      {teams.map(t => (
        <Link key={t.id} href={`/team/${t.id}`} className="team-chip">
          <TeamLogo team={t} size={54} />
          <span className="team-chip-abbr">{t.name}</span>
        </Link>
      ))}
    </div>
  );
}
