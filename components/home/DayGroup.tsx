import { MatchCard } from '@/components/cards/MatchCard';
import { getTeam, DAY_FULL } from '@/lib/data';
import type { DayGroup as DayGroupType } from '@/types/nfl';

interface Props { group: DayGroupType; }

export function DayGroup({ group }: Props) {
  return (
    <div className="day-group">
      <div className="day-head">
        <span className="day-name">{DAY_FULL[group.day]}</span>
        <span className="day-time">{group.games[0].time} hs</span>
      </div>
      <div className="cards-grid">
        {group.games.map(g => {
          const away = getTeam(g.awayId);
          const home = getTeam(g.homeId);
          if (!away || !home) return null;
          return <MatchCard key={g.id} game={g} away={away} home={home} />;
        })}
      </div>
    </div>
  );
}
