'use client';
import { useState } from 'react';
import { Tabs } from '@/components/controls/Tabs';
import type { Team, Game, TeamRecord } from '@/types/nfl';
import { TeamGames } from './TeamGames';
import { DepthChart } from './DepthChart';
import { SeasonPicker } from './SeasonPicker';


interface Props { team: Team; games: Game[]; record: TeamRecord; recordStr: string; season: string; }

export function TeamTabs({ team, games, record, recordStr, season }: Props) {
  const [tab, setTab] = useState('games');
  const TABS = [
    { id: 'games', label: 'Games' },
    { id: 'playoffs', label: 'Playoffs' },
    { id: 'depth', label: 'Depth chart' },
    { id: 'stadium', label: 'Stadium' },
  ];
  return (
    <>
      <SeasonPicker teamId={team.id} season={season} />
      <Tabs tabs={TABS} active={tab} onChange={setTab} />
      <div className="detail-body">
        {tab === 'games' && <TeamGames games={games} teamId={team.id} />}
        {tab === 'playoffs' && (
          <section className="panel">
            <h3 className="panel-h">Playoffs</h3>
            <p className="muted">
              Según el récord actual ({recordStr}), {team.city} {team.name} {record.w >= 7
                ? 'está en posición de clasificar.'
                : 'pelea por un lugar de comodín.'} El cuadro de playoffs se mostrará aquí cuando aplique.
            </p>
            <div className="bracket-ph">
              {['Wild Card', 'Divisional', 'Conference', 'Super Bowl'].map(r => (
                <div className="br-col" key={r}>
                  <span className="br-round">{r}</span>
                  <span className="br-slot" /><span className="br-slot" />
                </div>
              ))}
            </div>
          </section>
        )}
        {tab === 'depth' && <DepthChart teamId={team.id} />}
        {tab === 'stadium' && (
          <section className="panel">
            <h3 className="panel-h">{team.stadium}</h3>
            <div className="img-ph lg"><span className="ph-caption">Foto de {team.stadium}</span></div>
            <div className="stadium-facts">
              <div className="fact"><span className="fact-k">Ciudad</span><span className="fact-v">{team.city}</span></div>
              <div className="fact"><span className="fact-k">Conferencia</span><span className="fact-v">{team.conf} {team.div}</span></div>
              <div className="fact"><span className="fact-k">Capacidad</span><span className="fact-v ph-text">00.000</span></div>
              <div className="fact"><span className="fact-k">Superficie</span><span className="fact-v ph-text">Césped</span></div>
            </div>
          </section>
        )}
      </div>
    </>
  );
}
