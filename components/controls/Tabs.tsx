'use client';
interface TabDef { id: string; label: string; }
interface Props { tabs: TabDef[]; active: string; onChange: (id: string) => void; }

export function Tabs({ tabs, active, onChange }: Props) {
  return (
    <div className="tabs" role="tablist">
      {tabs.map(t => (
        <button key={t.id} role="tab" className={`tab${t.id === active ? ' active' : ''}`}
          onClick={() => onChange(t.id)}>{t.label}</button>
      ))}
    </div>
  );
}
