import { TeamLogo } from '@/components/ui/TeamLogo';
import { Icon } from '@/components/ui/Icon';
import type { Team, TeamRecord } from '@/types/nfl';

interface Props { team: Team; record: TeamRecord; recordStr: string; season: string; }

export function TeamBanner({ team, record, recordStr, season }: Props) {
  const gradient = `linear-gradient(168deg, ${team.primary} 0%, ${team.secondary} 50%, var(--bg) 100%)`;
  const style = team.banner
    ? { backgroundImage: `url("${team.banner}")`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : { background: gradient };
  return (
    <div className="team-banner" style={style}>
      <div className="tb-scrim" />
      <div className="tb-content">
        <TeamLogo team={team} size={96} />
        <div className="tb-info">
          <h1 className="tb-name">{team.city} {team.name}</h1>
          <div className="tb-tags">
            <span className="tb-tag">{team.conf} — {team.div}</span>
            <span className="tb-dot">·</span>
            <span className="tb-stadium"><Icon name="pin" size={13} />{team.stadium}</span>
          </div>
        </div>
        <div className="tb-record">
          <span className="tb-rec-num">{recordStr}</span>
          <span className="tb-rec-label">Récord {season}</span>
        </div>
      </div>
    </div>
  );
}
