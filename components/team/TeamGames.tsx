import { MatchCard } from '@/components/cards/MatchCard';
import { getTeam } from '@/lib/data';
import type { Game } from '@/types/nfl';

interface Props { games: Game[]; }

export function TeamGames({ games }: Props) {
  const byWeek: Record<number, Game[]> = {};
  games.forEach(g => { (byWeek[g.week] = byWeek[g.week] || []).push(g); });
  return (
    <div className="team-games">
      {Object.entries(byWeek).map(([w, gs]) => (
        <div className="tg-week" key={w}>
          <div className="tg-week-head">Semana {w}</div>
          {gs.map(g => {
            const away = getTeam(g.awayId);
            const home = getTeam(g.homeId);
            if (!away || !home) return null;
            return <MatchCard key={g.id} game={g} away={away} home={home} />;
          })}
        </div>
      ))}
    </div>
  );
}
