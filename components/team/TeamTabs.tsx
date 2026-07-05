'use client';
import { useState } from 'react';
import { Tabs } from '@/components/controls/Tabs';
import type { Team, Game, DepthGroup, PlayoffPicture } from '@/types/nfl';
import type { TeamSeasonStats } from '@/lib/services/team-detail';
import { TeamGames } from './TeamGames';
import { DepthChart } from './DepthChart';
import { SeasonPicker } from './SeasonPicker';
import { PlayoffBracket } from '@/components/playoffs/PlayoffBracket';
import { StadiumMap } from '@/components/ui/StadiumMap';

interface Props {
  team: Team; games: Game[];
  season: string; seasonStats: TeamSeasonStats | null;
  depthChart: DepthGroup[];
  playoffs: PlayoffPicture | null;
}

export function TeamTabs({ team, games, season, seasonStats, depthChart, playoffs }: Props) {
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
      {seasonStats && (
        <div className="stadium-facts" style={{ marginTop: 16 }}>
          <div className="fact"><span className="fact-k">Pass Yds/G</span><span className="fact-v">{seasonStats.passYardsPerGame}</span></div>
          <div className="fact"><span className="fact-k">Rush Yds/G</span><span className="fact-v">{seasonStats.rushYardsPerGame}</span></div>
          <div className="fact"><span className="fact-k">Touchdowns</span><span className="fact-v">{seasonStats.touchdowns}</span></div>
          <div className="fact"><span className="fact-k">Sacks</span><span className="fact-v">{seasonStats.sacks}</span></div>
          <div className="fact"><span className="fact-k">3er Down</span><span className="fact-v" style={{fontSize:13}}>{seasonStats.thirdDown}</span></div>
          <div className="fact"><span className="fact-k">INT (def)</span><span className="fact-v">{seasonStats.defInterceptions}</span></div>
        </div>
      )}
      <Tabs tabs={TABS} active={tab} onChange={setTab} />
      <div className="detail-body">
        {tab === 'games' && <TeamGames games={games} />}
        {tab === 'playoffs' && (
          <section className="panel">
            <h3 className="panel-h">Playoffs · {season}</h3>
            {playoffs ? (
              <PlayoffBracket picture={playoffs} />
            ) : (
              <p className="muted">
                No hay datos de playoffs para la temporada {season} de {team.city} {team.name}.
              </p>
            )}
          </section>
        )}
        {tab === 'depth' && <DepthChart groups={depthChart} />}
        {tab === 'stadium' && (
          <section className="panel">
            <h3 className="panel-h">{team.stadium}</h3>
            <StadiumMap query={`${team.stadium} ${team.city}`} title={`Mapa de ${team.stadium}`} />
            <div className="stadium-facts" style={{ marginTop: 16 }}>
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
