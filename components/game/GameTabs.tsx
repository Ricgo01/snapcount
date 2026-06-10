'use client';
import { useState } from 'react';
import { Tabs } from '@/components/controls/Tabs';
import { TeamLogo } from '@/components/ui/TeamLogo';
import { Icon } from '@/components/ui/Icon';
import { MatchCard } from '@/components/cards/MatchCard';
import { StadiumMap } from '@/components/ui/StadiumMap';
import type { Game, Team, GameStatsResult, PlayerStatsResult } from '@/types/nfl';

interface Props {
  game: Game;
  away: Team;
  home: Team;
  teamStats: GameStatsResult | null;
  playerStats: PlayerStatsResult | null;
  headToHead: Game[];
}

/** YouTube search for the game's highlights — a plain link, no embedding. */
function highlightsUrl(game: Game, away: Team, home: Team): string {
  const year = game.season.split('-')[0];
  const q = `${away.city} ${away.name} vs ${home.city} ${home.name} week ${game.week} ${year} highlights`;
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`;
}

export function GameTabs({ game, away, home, teamStats, playerStats, headToHead }: Props) {
  const [tab, setTab] = useState('datos');
  const TABS = [
    { id: 'datos', label: 'Datos' },
    { id: 'resumen', label: 'Resumen' },
    { id: 'historial', label: 'Historial' },
  ];

  return (
    <>
      <Tabs tabs={TABS} active={tab} onChange={setTab} />
      {tab === 'datos' && (
        <div className="detail-body">
          <section className="panel">
            <h3 className="panel-h">Stats de jugadores por equipo</h3>
            {playerStats
              ? <PlayerStatsView away={away} home={home} ps={playerStats} />
              : <p className="muted">Las estadísticas de jugadores estarán disponibles al comenzar el partido.</p>}
          </section>
        </div>
      )}
      {tab === 'resumen' && (
        <div className="detail-body">
          <section className="panel">
            <h3 className="panel-h">Stats por equipo</h3>
            {teamStats ? <TeamStatsView away={away} home={home} stats={teamStats} /> : <p className="muted">Sin datos por el momento.</p>}
          </section>
          {game.status !== 'scheduled' && (
            <section className="panel">
              <h3 className="panel-h">Video</h3>
              <a className="video-ph video-link" href={highlightsUrl(game, away, home)}
                target="_blank" rel="noopener noreferrer">
                <span className="video-play"><Icon name="play" size={26} /></span>
                <span className="ph-caption">Ver highlights en YouTube</span>
              </a>
            </section>
          )}
          {game.stadium && game.stadium !== 'TBD' && (
            <section className="panel">
              <h3 className="panel-h">Estadio · {game.stadium}</h3>
              <StadiumMap query={game.stadium} title={`Mapa de ${game.stadium}`} />
            </section>
          )}
        </div>
      )}
      {tab === 'historial' && (
        <div className="detail-body">
          <HeadToHead away={away} home={home} meetings={headToHead} />
        </div>
      )}
    </>
  );
}

function HeadToHead({ away, home, meetings }: { away: Team; home: Team; meetings: Game[] }) {
  if (!meetings.length) {
    return (
      <section className="panel">
        <h3 className="panel-h">Enfrentamientos previos</h3>
        <p className="muted">Sin enfrentamientos previos registrados entre {away.name} y {home.name}.</p>
      </section>
    );
  }
  let awayWins = 0, homeWins = 0;
  for (const m of meetings) {
    if (m.homeScore === null || m.awayScore === null || m.homeScore === m.awayScore) continue;
    const winner = m.homeScore > m.awayScore ? m.homeId : m.awayId;
    if (winner === away.id) awayWins++;
    else if (winner === home.id) homeWins++;
  }
  return (
    <section className="panel">
      <h3 className="panel-h">Enfrentamientos previos</h3>
      <p className="muted" style={{ marginBottom: 12 }}>
        Serie reciente: {away.id} {awayWins} — {homeWins} {home.id}
      </p>
      <div className="team-games">
        {meetings.map(m => (
          <div className="tg-week" key={m.id}>
            <div className="tg-week-head">Temporada {m.season} · Semana {m.week}</div>
            <MatchCard game={m} away={m.awayId === away.id ? away : home} home={m.homeId === home.id ? home : away} />
          </div>
        ))}
      </div>
    </section>
  );
}

function TeamStatsView({ away, home, stats }: { away: Team; home: Team; stats: GameStatsResult }) {
  const rows: [string, keyof GameStatsResult['home']][] = [
    ['Yardas totales', 'yards'], ['Pase', 'pass'], ['Carrera', 'rush'],
    ['First downs', 'first'], ['3er down', 'third'], ['Posesión', 'poss'], ['Turnovers', 'turn'],
  ];
  return (
    <div className="team-stats">
      <div className="ts-head">
        <span className="ts-team"><TeamLogo team={away} size={28} />{away.id}</span>
        <span />
        <span className="ts-team" style={{ justifyContent: 'flex-end' }}>{home.id}<TeamLogo team={home} size={28} /></span>
      </div>
      {rows.map(([lbl, k]) => (
        <div className="ts-row" key={k}>
          <span className="ts-a">{stats.away[k]}</span>
          <span className="ts-l">{lbl}</span>
          <span className="ts-b">{stats.home[k]}</span>
        </div>
      ))}
    </div>
  );
}

/** ESPN category id → Spanish display title */
const CAT_TITLES: Record<string, string> = {
  passing:       'Pase',
  rushing:       'Carrera',
  receiving:     'Recepción',
  fumbles:       'Fumbles',
  defensive:     'Defensa',
  interceptions: 'Intercepciones',
  kickReturns:   'Dev. de kickoff',
  puntReturns:   'Dev. de despeje',
  kicking:       'Pateo',
  punting:       'Despeje',
};

function PsCat({ title, cols, rows, totals }: {
  title: string; cols: string[];
  rows: { name: string; vals: string[] }[];
  totals?: string[];
}) {
  const grid = {
    gridTemplateColumns: `minmax(110px,1fr) repeat(${cols.length}, minmax(34px,46px))`,
    minWidth: 110 + cols.length * 42,
  };
  return (
    <div className="pstats-cat">
      <div className="pstats-cat-h">{title}</div>
      <div className="pstats-scroll">
        <div className="ps-row ps-head" style={grid}>
          <span className="ps-name">Jugador</span>
          {cols.map((c, i) => <span className="ps-stat" key={i}>{c}</span>)}
        </div>
        {rows.map((rw, i) => (
          <div className="ps-row" style={grid} key={i}>
            <span className="ps-name">{rw.name}</span>
            {rw.vals.map((v, j) => <span className="ps-stat" key={j}>{v}</span>)}
          </div>
        ))}
        {totals && totals.length > 0 && (
          <div className="ps-row ps-total" style={grid}>
            <span className="ps-name">Total</span>
            {totals.map((v, j) => <span className="ps-stat" key={j}>{v}</span>)}
          </div>
        )}
      </div>
    </div>
  );
}

function PlayerStatsView({ away, home, ps }: { away: Team; home: Team; ps: PlayerStatsResult }) {
  return (
    <div className="player-stats">
      {([['away', away], ['home', home]] as const).map(([side, team]) => (
        <div key={side} className="pstats-col">
          <div className="pstats-team"><TeamLogo team={team} size={26} />{team.name}</div>
          {(ps[side]?.categories ?? []).map(cat => (
            <PsCat key={cat.name} title={CAT_TITLES[cat.name] ?? cat.name}
              cols={cat.labels} rows={cat.rows} totals={cat.totals} />
          ))}
        </div>
      ))}
    </div>
  );
}
