import Link from 'next/link';
import { TeamLogo } from '@/components/ui/TeamLogo';
import { LiveBadge } from '@/components/ui/LiveBadge';
import { Icon } from '@/components/ui/Icon';
import type { Game, Team } from '@/types/nfl';

interface Props { game: Game; away: Team; home: Team; }

export function MatchCard({ game, away, home }: Props) {
  const hasScore = game.status === 'final' || game.status === 'live';
  const homeWin = game.status === 'final' && (game.homeScore ?? 0) > (game.awayScore ?? 0);
  const awayWin = game.status === 'final' && (game.awayScore ?? 0) > (game.homeScore ?? 0);
  const statusLabel = game.status === 'live'
    ? `LIVE ${game.quarter}º · ${game.clock}`
    : game.status === 'final' ? 'Final'
    : `${game.day} · ${game.time}`;

  return (
    <div
      className="match-card"
      style={{ '--awayc': away.primary, '--homec': home.primary } as React.CSSProperties}
    >
      {/* Stretched link: covers the full card, sits at z-index 1 */}
      <Link
        href={`/game/${game.id}`}
        className="mc-game-link"
        aria-label={`${away.city} ${away.name} at ${home.city} ${home.name} · ${statusLabel}`}
      />

      <span className="mc-status">
        {game.status === 'live' ? <LiveBadge small /> : <span className="mc-status-txt">{statusLabel}</span>}
        {game.status === 'live' && <span className="mc-clock">{game.quarter}º · {game.clock}</span>}
      </span>

      <span className="mc-body">
        {/* Team links sit at z-index 2, above the stretched game link */}
        <Link
          href={`/team/${away.id}`}
          className={`mc-team mc-away${awayWin ? ' win' : hasScore && game.status === 'final' ? ' lose' : ''}`}
          aria-label={`${away.city} ${away.name}`}
        >
          <TeamLogo team={away} size={50} />
          <span className="mc-abbr">{away.name}</span>
        </Link>

        <span className="mc-center">
          {hasScore ? (
            <span className="mc-score">
              <b className={awayWin ? 'lead' : ''}>{game.awayScore}</b>
              <i>at</i>
              <b className={homeWin ? 'lead' : ''}>{game.homeScore}</b>
            </span>
          ) : <span className="mc-at">at</span>}
          <span className="mc-stadium"><Icon name="pin" size={11} />{game.stadium}</span>
        </span>

        <Link
          href={`/team/${home.id}`}
          className={`mc-team mc-home${homeWin ? ' win' : hasScore && game.status === 'final' ? ' lose' : ''}`}
          aria-label={`${home.city} ${home.name}`}
        >
          <TeamLogo team={home} size={50} />
          <span className="mc-abbr">{home.name}</span>
        </Link>
      </span>
    </div>
  );
}
