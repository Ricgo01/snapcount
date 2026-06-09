interface Props {
  label: string;
  a: number | string;
  b: number | string;
  fmt?: (v: number | string) => string;
}

export function StatBar({ label, a, b, fmt }: Props) {
  const av = typeof a === 'number' ? a : parseFloat(String(a)) || 0;
  const bv = typeof b === 'number' ? b : parseFloat(String(b)) || 0;
  const tot = av + bv || 1;
  const aLead = av >= bv;
  return (
    <div className="statbar">
      <span className={`sb-val sb-a${aLead ? ' lead' : ''}`}>{fmt ? fmt(a) : a}</span>
      <span className="sb-label">{label}</span>
      <span className={`sb-val sb-b${!aLead ? ' lead' : ''}`}>{fmt ? fmt(b) : b}</span>
      <span className="sb-track">
        <span className="sb-fill sb-fill-a" style={{ width: (av / tot * 100) + '%' }} />
        <span className="sb-fill sb-fill-b" style={{ width: (bv / tot * 100) + '%' }} />
      </span>
    </div>
  );
}
