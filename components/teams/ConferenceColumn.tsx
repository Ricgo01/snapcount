import { DivisionBlock } from './DivisionBlock';
import type { Conference, Team, TeamRecord } from '@/types/nfl';

interface TeamRow extends Team { record: TeamRecord; recordStr: string; }
interface DivData { div: string; teams: TeamRow[]; }
interface Props { conf: Conference; divisions: DivData[]; }

export function ConferenceColumn({ conf, divisions }: Props) {
  return (
    <div className="conf-col">
      <div className={`conf-head conf-${conf.toLowerCase()}`}>{conf}</div>
      <div className="conf-divs">
        {divisions.map(d => <DivisionBlock key={d.div} div={d.div} teams={d.teams} />)}
      </div>
    </div>
  );
}
