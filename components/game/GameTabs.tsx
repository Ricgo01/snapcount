'use client';
import { useState } from 'react';
import { Tabs } from '@/components/controls/Tabs';
import { TeamLogo } from '@/components/ui/TeamLogo';
import { Icon } from '@/components/ui/Icon';
import type { Game, Team, GameStatsResult, PlayerStatsResult } from '@/types/nfl';

interface Props {
  game: Game;
  away: Team;
  home: Team;
  chronicle: string;
  teamStats: GameStatsResult | null;
  playerStats: PlayerStatsResult | null;
}

export function GameTabs({ game, away, home, chronicle, teamStats, playerStats }: Props) {
  const [tab, setTab] = useState('datos');
  const TABS = [{ id: 'datos', label: 'Datos' }, { id: 'resumen', label: 'Resumen' }];

  return (
    <>
      <Tabs tabs={TABS} active={tab} onChange={setTab} />
      {tab === 'datos' && (
        <div className="detail-body">
          <section className="panel">
            <h3 className="panel-h">Crónica</h3>
            <p className="chronicle">{chronicle}</p>
          </section>
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
          <section className="panel">
            <h3 className="panel-h">Video</h3>
            <div className="video-ph">
              <button className="video-play"><Icon name="play" size={26} /></button>
              <span className="ph-caption">Reproductor de video · highlights</span>
            </div>
          </section>
          <section className="panel">
            <h3 className="panel-h">Estadio</h3>
            <div className="img-ph lg">
              <span className="ph-caption">Foto de {game.stadium}</span>
            </div>
          </section>
        </div>
      )}
    </>
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

function PsCat({ title, cols, rows }: { title: string; cols: string[]; rows: { name: string; vals: (string | number)[] }[] }) {
  const grid = { gridTemplateColumns: `minmax(0,1fr) repeat(${cols.length}, minmax(34px,46px))` };
  return (
    <div className="pstats-cat">
      <div className="pstats-cat-h">{title}</div>
      <div className="ps-row ps-head" style={grid}>
        <span className="ps-name">Jugador</span>
        {cols.map(c => <span className="ps-stat" key={c}>{c}</span>)}
      </div>
      {rows.map((rw, i) => (
        <div className="ps-row" style={grid} key={i}>
          <span className="ps-name">{rw.name}</span>
          {rw.vals.map((v, j) => <span className="ps-stat" key={j}>{v}</span>)}
        </div>
      ))}
    </div>
  );
}

function PlayerStatsView({ away, home, ps }: { away: Team; home: Team; ps: PlayerStatsResult }) {
  return (
    <div className="player-stats">
      {([['away', away], ['home', home]] as const).map(([side, team]) => (
        <div key={side} className="pstats-col">
          <div className="pstats-team"><TeamLogo team={team} size={26} />{team.name}</div>
          <PsCat title="Pase" cols={['C/I', 'Yds', 'TD', 'INT']} rows={ps[side].passing.map(p => ({ name: p.name, vals: [p.line, p.yds, p.td, p.int] }))} />
          <PsCat title="Carrera" cols={['Ac', 'Yds', 'TD']} rows={ps[side].rushing.map(p => ({ name: p.name, vals: [p.car, p.yds, p.td] }))} />
          <PsCat title="Recepción" cols={['Rec', 'Yds', 'TD']} rows={ps[side].receiving.map(p => ({ name: p.name, vals: [p.rec, p.yds, p.td] }))} />
        </div>
      ))}
    </div>
  );
}
