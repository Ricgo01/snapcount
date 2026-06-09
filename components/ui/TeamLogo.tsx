import type { Team } from '@/types/nfl';

interface Props { team: Team; size?: number; }

export function TeamLogo({ team, size = 44 }: Props) {
  const fs = Math.round(size * 0.34);
  if (team.logo) {
    return (
      <span
        className="team-logo team-logo--img"
        title={`${team.city} ${team.name}`}
        style={{ width: size, height: size }}>
        <img src={team.logo} alt={`${team.city} ${team.name} logo`} draggable={false} />
      </span>
    );
  }
  return (
    <span
      className="team-logo"
      title={`${team.city} ${team.name} — placeholder de logo`}
      style={{ width: size, height: size, fontSize: fs }}>
      <span className="team-logo-abbr">{team.id}</span>
    </span>
  );
}
