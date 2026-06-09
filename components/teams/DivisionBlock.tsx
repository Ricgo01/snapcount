import Link from 'next/link';
import { TeamLogo } from '@/components/ui/TeamLogo';
import type { Team, TeamRecord } from '@/types/nfl';

interface TeamRow extends Team { record: TeamRecord; recordStr: string; }
interface Props { div: string; teams: TeamRow[]; }

export function DivisionBlock({ div, teams }: Props) {
  return (
    <div className="div-block">
      <div className="div-head">{div}</div>
      <div className="div-teams">
        {teams.map((t, i) => (
          <Link key={t.id} href={`/team/${t.id}`} className="standing-row">
            <span className="sr-rank">{i + 1}</span>
            <TeamLogo team={t} size={34} />
            <span className="sr-name"><b>{t.name}</b><small>{t.city}</small></span>
            <span className="sr-rec">{t.recordStr}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
