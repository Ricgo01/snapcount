import Link from 'next/link';
import { TeamLogo } from '@/components/ui/TeamLogo';
import { LiveBadge } from '@/components/ui/LiveBadge';
import { DAY_FULL } from '@/lib/data';
import type { Game, Team } from '@/types/nfl';

interface Props { game: Game; away: Team; home: Team; }

export function GameBanner({ game, away, home }: Props) {
  const gradient = `linear-gradient(100deg, ${away.primary} 0%, ${away.primary} 34%, ${home.primary} 66%, ${home.primary} 100%)`;
  const hasScore = game.status !== 'scheduled';
  const awayLead = (game.awayScore ?? 0) >= (game.homeScore ?? 0);
  const homeLead = (game.homeScore ?? 0) >= (game.awayScore ?? 0);
  return (
    <div className="game-banner" style={{ background: gradient }}>
      <div className="gb-scrim" />
      <div className="gb-row">
        <Link href={`/team/${away.id}`} className="gb-mark">
          <TeamLogo team={away} size={150} />
        </Link>
        <div className="gb-mid">
          <div className="gb-matchup">
            <span className="gb-team-info gb-team-info--away">
              <span className="gb-name">{away.name}</span>
              <span className="gb-city">{away.city}</span>
            </span>
            <span className="gb-vs">AT</span>
            <span className="gb-team-info gb-team-info--home">
              <span className="gb-name">{home.name}</span>
              <span className="gb-city">{home.city}</span>
            </span>
          </div>
          <div className="gb-center">
            {game.status === 'live' && <LiveBadge />}
            {hasScore && (
              <div className="gb-score">
                <span className={awayLead ? 'lead' : ''}>{game.awayScore}</span>
                <i>–</i>
                <span className={homeLead ? 'lead' : ''}>{game.homeScore}</span>
              </div>
            )}
            <div className="gb-meta">
              {game.status === 'live' ? `${game.quarter}º cuarto · ${game.clock}`
                : game.status === 'final' ? 'Final'
                : `${DAY_FULL[game.day]} · ${game.time} hs`}
            </div>
            <div className="gb-sub">Semana {game.week} · {game.stadium}</div>
          </div>
        </div>
        <Link href={`/team/${home.id}`} className="gb-mark">
          <TeamLogo team={home} size={150} />
        </Link>
      </div>
    </div>
  );
}
