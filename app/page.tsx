import { Header } from '@/components/ui/Header';
import { SectionTitle } from '@/components/ui/SectionTitle';
import { TeamsRail } from '@/components/home/TeamsRail';
import { DayGroup } from '@/components/home/DayGroup';
import { MatchCard } from '@/components/cards/MatchCard';
import { PlayoffBracket } from '@/components/playoffs/PlayoffBracket';
import { getScoreboard, getLiveGames, getCurrentWeek } from '@/lib/services/scoreboard';
import { getPlayoffPicture } from '@/lib/services/playoffs';
import { TEAMS, SEASONS, getTeam, groupByDay, CURRENT_SEASON } from '@/lib/data';
import Link from 'next/link';

export default async function HomePage() {
  const week = await getCurrentWeek(CURRENT_SEASON);
  const prevSeason = SEASONS[1];
  const [allGames, live, currentPicture, prevPicture] = await Promise.all([
    getScoreboard(week, CURRENT_SEASON),
    getLiveGames(CURRENT_SEASON),
    getPlayoffPicture(CURRENT_SEASON),
    getPlayoffPicture(SEASONS[1]),
  ]);

  // Before the current playoffs exist, show last season's real bracket
  const picture       = currentPicture ?? prevPicture;
  const playoffSeason = currentPicture ? CURRENT_SEASON : prevSeason;

  const upcoming  = allGames.filter(g => g.status !== 'live');
  const dayGroups = groupByDay(upcoming);

  return (
    <div className="screen">
      <Header
        title="Welcome"
        subtitle={`NFL · Temporada ${CURRENT_SEASON} · Semana ${week}`}
      />

      {picture && (
        <section className="block">
          <SectionTitle right={<Link href={`/season?week=playoffs&season=${playoffSeason}`} className="link-btn">Ver cuadro completo</Link>}>
            Playoffs {playoffSeason} · Camino al Super Bowl
          </SectionTitle>
          <PlayoffBracket picture={picture} />
        </section>
      )}

      <section className="block">
        <SectionTitle right={<Link href="/teams" className="link-btn">Ver todos</Link>}>
          All teams
        </SectionTitle>
        <TeamsRail teams={TEAMS} />
      </section>

      {live.length > 0 && (
        <section className="block">
          <SectionTitle right={<span className="pill-live"><span className="live-dot" />{live.length} en vivo</span>}>
            En vivo ahora
          </SectionTitle>
          <div className="cards-grid">
            {live.map(g => {
              const away = getTeam(g.awayId);
              const home = getTeam(g.homeId);
              if (!away || !home) return null;
              return <MatchCard key={g.id} game={g} away={away} home={home} />;
            })}
          </div>
        </section>
      )}

      <section className="block">
        <SectionTitle>Next Games</SectionTitle>
        {dayGroups.map(grp => <DayGroup key={grp.day} group={grp} />)}
      </section>
    </div>
  );
}
