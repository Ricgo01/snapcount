import { TeamLogo } from '@/components/ui/TeamLogo';
import { Icon } from '@/components/ui/Icon';
import { getTeam } from '@/lib/data';
import type { PlayoffPicture, PlayoffSeed, PlayoffMatchup } from '@/types/nfl';

interface PoTeamProps { s: PlayoffSeed | null; win: boolean; side: 'l' | 'r'; }

function PoTeam({ s, win, side }: PoTeamProps) {
  if (!s) {
    return (
      <div className={`po-team po-empty po-${side}`}>
        <span className="po-seed" />
        <span className="po-name">Por definir</span>
      </div>
    );
  }
  const t = getTeam(s.id)!;
  return (
    <div className={`po-team po-${side}${win ? ' win' : ' out'}`} title={`${t.city} ${t.name} · #${s.seed}`}>
      <span className="po-seed">{s.seed}</span>
      <TeamLogo team={t} size={30} />
      <span className="po-name">{t.name}</span>
    </div>
  );
}

interface PoMatchProps { m: PlayoffMatchup; winner: PlayoffSeed | null; side: 'l' | 'r'; }

function PoMatch({ m, winner, side }: PoMatchProps) {
  const wid = winner ? winner.id : null;
  return (
    <div className={`po-match po-match-${side}`}>
      <PoTeam s={m.a} win={!!m.a && m.a.id === wid} side={side} />
      <PoTeam s={m.b} win={!!m.b && m.b.id === wid} side={side} />
    </div>
  );
}

function PoRound({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="po-round">
      <div className="po-round-h">{label}</div>
      <div className="po-round-body">{children}</div>
    </div>
  );
}

interface Props { picture: PlayoffPicture; }

export function PlayoffBracket({ picture }: Props) {
  const { afc, nfc, champ } = picture;
  const champTeam = getTeam(champ.id)!;
  return (
    <>
      <div className="po-confs">
        <span className="po-conf po-conf-afc">AFC</span>
        <span className="po-conf-mid">Camino al Super Bowl</span>
        <span className="po-conf po-conf-nfc">NFC</span>
      </div>
      <div className="po-scroll">
        <div className="po-bracket">
          {/* AFC (izquierda → centro) */}
          <PoRound label="Wild Card">
            {afc.wild.map((m, i) => <PoMatch key={i} m={m} winner={afc.wildW[i]} side="l" />)}
          </PoRound>
          <PoRound label="Divisional">
            {afc.divi.map((m, i) => <PoMatch key={i} m={m} winner={afc.diviWin[i]} side="l" />)}
          </PoRound>
          <PoRound label="Final AFC">
            <PoMatch m={afc.final} winner={afc.champ} side="l" />
          </PoRound>

          {/* Super Bowl (centro) */}
          <div className="po-sb">
            <div className="po-sb-h"><Icon name="playoffs" size={20} />Super Bowl</div>
            <div className="po-sb-card">
              <PoTeam s={afc.champ} win={champ.id === afc.champ.id} side="l" />
              <span className="po-sb-vs">vs</span>
              <PoTeam s={nfc.champ} win={champ.id === nfc.champ.id} side="l" />
            </div>
            <div className="po-sb-champ">
              <span className="po-sb-champ-k">Campeón proyectado</span>
              <span className="po-sb-champ-v"><TeamLogo team={champTeam} size={22} />{champTeam.city} {champTeam.name}</span>
            </div>
          </div>

          {/* NFC (centro → derecha, espejado) */}
          <PoRound label="Final NFC">
            <PoMatch m={nfc.final} winner={nfc.champ} side="r" />
          </PoRound>
          <PoRound label="Divisional">
            {nfc.divi.map((m, i) => <PoMatch key={i} m={m} winner={nfc.diviWin[i]} side="r" />)}
          </PoRound>
          <PoRound label="Wild Card">
            {nfc.wild.map((m, i) => <PoMatch key={i} m={m} winner={nfc.wildW[i]} side="r" />)}
          </PoRound>
        </div>
      </div>
    </>
  );
}
