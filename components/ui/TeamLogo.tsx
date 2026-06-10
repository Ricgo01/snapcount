import type { Team } from '@/types/nfl';

interface Props { team: Team; size?: number; }

/** ESPN logo CDN code — matches our canonical abbr except Washington. */
function espnLogoUrl(id: string): string {
  const code = id === 'WAS' ? 'wsh' : id.toLowerCase();
  return `https://a.espncdn.com/i/teamlogos/nfl/500/${code}.png`;
}

export function TeamLogo({ team, size = 44 }: Props) {
  return (
    <span
      className="team-logo team-logo--img"
      title={`${team.city} ${team.name}`}
      style={{ width: size, height: size }}>
      <img src={team.logo ?? espnLogoUrl(team.id)} alt={`${team.city} ${team.name} logo`} draggable={false} />
    </span>
  );
}
