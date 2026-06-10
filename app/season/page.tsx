import { Header } from '@/components/ui/Header';
import { WeekSelector } from '@/components/season/WeekSelector';
import { DayGroup } from '@/components/home/DayGroup';
import { PlayoffBracket } from '@/components/playoffs/PlayoffBracket';
import { getScoreboard, getCurrentWeek } from '@/lib/services/scoreboard';
import { getPlayoffPicture } from '@/lib/services/playoffs';
import { groupByDay, CURRENT_SEASON } from '@/lib/data';

interface Props { searchParams: Promise<{ season?: string; week?: string }> }

export async function generateMetadata({ searchParams }: Props) {
  const params = await searchParams;
  const season = params.season ?? CURRENT_SEASON;
  const isPlayoffs = params.week === 'playoffs';
  return {
    title: isPlayoffs
      ? `Playoffs NFL ${season} · bracket y resultados`
      : `Temporada NFL ${season} · partidos por semana`,
    description: isPlayoffs
      ? `Bracket completo de playoffs de la NFL ${season}: Wild Card, Divisional, finales de conferencia y Super Bowl con marcadores reales.`
      : `Todos los partidos de la temporada ${season} de la NFL semana a semana, con marcadores finales y enlaces al detalle de cada juego.`,
  };
}

export default async function SeasonPage({ searchParams }: Props) {
  const params      = await searchParams;
  const season      = params.season ?? CURRENT_SEASON;
  const currentWeek = await getCurrentWeek(season);
  const weekParam   = params.week ?? String(currentWeek);
  const isPlayoffs  = weekParam === 'playoffs';
  const weekNum     = isPlayoffs ? currentWeek : parseInt(weekParam, 10);
  const [games, playoffPic] = await Promise.all([
    isPlayoffs ? Promise.resolve([]) : getScoreboard(weekNum, season),
    isPlayoffs ? getPlayoffPicture(season) : Promise.resolve(null),
  ]);
  const dayGroups = isPlayoffs ? [] : groupByDay(games);
  const subtitle    = isPlayoffs
    ? `Temporada ${season} · proyección del cuadro de playoffs`
    : `Temporada ${season} · partidos por semana`;

  return (
    <div className="screen">
      <Header title="Season" subtitle={subtitle}>
        <WeekSelector season={season} week={weekParam} />
      </Header>
      {isPlayoffs && playoffPic ? (
        <section className="block">
          <PlayoffBracket picture={playoffPic} />
          <p className="po-note">Resultados reales de la temporada {season}. El cabeza de serie Nº1 descansa en Wild Card.</p>
        </section>
      ) : dayGroups.map(grp => (
        <DayGroup key={grp.day} group={grp} />
      ))}
    </div>
  );
}
