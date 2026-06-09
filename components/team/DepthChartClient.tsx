'use client';
import { useState } from 'react';
import type { DepthGroup } from '@/types/nfl';

interface Props { groups: DepthGroup[]; }

function DcPosition({ group }: { group: DepthGroup }) {
  const cols = group.stats;
  const tmpl = `34px minmax(132px,1.6fr) ` + cols.map(() => 'minmax(50px,1fr)').join(' ');
  return (
    <div className="dc-pos">
      <div className="dc-pos-head">
        <span className="dc-pos-code">{group.pos}</span>
        <span className="dc-pos-label">{group.label}</span>
        <span className="dc-pos-count">{group.players.length}</span>
      </div>
      <div className="dc-table">
        <div className="dc-row dc-head" style={{ gridTemplateColumns: tmpl }}>
          <span className="dc-num">#</span>
          <span className="dc-player">Jugador</span>
          {cols.map(c => <span className="dc-cell" key={c}>{c}</span>)}
        </div>
        {group.players.map((p, i) => (
          <div className="dc-row" style={{ gridTemplateColumns: tmpl }} key={i}>
            <span className="dc-num">{p.num}</span>
            <span className="dc-player">
              <b>{p.name}</b>
              <span className={`dc-depth${i === 0 ? ' starter' : ''}`}>{i === 0 ? 'Titular' : `Suplente ${i}`}</span>
            </span>
            {cols.map(c => <span className="dc-cell" key={c}>{p.stats[c]}</span>)}
          </div>
        ))}
      </div>
    </div>
  );
}

export function DepthChartClient({ groups }: Props) {
  const [filter, setFilter] = useState('ALL');
  const shown = filter === 'ALL' ? groups : groups.filter(g => g.pos === filter);

  return (
    <section className="panel">
      <div className="dc-toolbar">
        <h3 className="panel-h">Depth chart</h3>
        <span className="dc-note">Stats de ejemplo · se conectarán a la API</span>
      </div>
      <div className="dc-filters" role="tablist" aria-label="Filtrar por posición">
        <button className={`dc-chip${filter === 'ALL' ? ' active' : ''}`} onClick={() => setFilter('ALL')}>Todos</button>
        {groups.map(g => (
          <button key={g.pos} className={`dc-chip${filter === g.pos ? ' active' : ''}`}
            onClick={() => setFilter(g.pos)} title={g.label}>{g.pos}</button>
        ))}
      </div>
      <div className="dc-groups">
        {shown.map(g => <DcPosition key={g.pos} group={g} />)}
      </div>
    </section>
  );
}
