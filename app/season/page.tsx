import { Header } from '@/components/ui/Header';
import { WeekSelector } from '@/components/season/WeekSelector';
import { DayGroup } from '@/components/home/DayGroup';
import { PlayoffBracket } from '@/components/playoffs/PlayoffBracket';
import { getScoreboard, getCurrentWeek } from '@/lib/services/scoreboard';
import { groupByDay, playoffPicture, CURRENT_SEASON } from '@/lib/data';

interface Props { searchParams: Promise<{ season?: string; week?: string }> }

export default async function SeasonPage({ searchParams }: Props) {
  const params      = await searchParams;
  const season      = params.season ?? CURRENT_SEASON;
  const currentWeek = await getCurrentWeek(season);
  const weekParam   = params.week ?? String(currentWeek);
  const isPlayoffs  = weekParam === 'playoffs';
  const weekNum     = isPlayoffs ? currentWeek : parseInt(weekParam, 10);
  const games       = isPlayoffs ? [] : await getScoreboard(weekNum, season);
  const dayGroups   = isPlayoffs ? [] : groupByDay(games);
  const subtitle    = isPlayoffs
    ? `Temporada ${season} · proyección del cuadro de playoffs`
    : `Temporada ${season} · partidos por semana`;

  return (
    <div className="screen">
      <Header title="Season" subtitle={subtitle}>
        <WeekSelector season={season} week={weekParam} />
      </Header>
      {isPlayoffs ? (
        <section className="block">
          <PlayoffBracket picture={playoffPicture()} />
          <p className="po-note">El cabeza de serie Nº1 de cada conferencia descansa en Wild Card. Proyección determinista según las posiciones actuales (Semana {currentWeek}).</p>
        </section>
      ) : dayGroups.map(grp => (
        <DayGroup key={grp.day} group={grp} />
      ))}
    </div>
  );
}
