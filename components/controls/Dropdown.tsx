'use client';
import { useState, useRef, useEffect } from 'react';
import { Icon } from '@/components/ui/Icon';

interface Props {
  label?: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
  align?: 'left' | 'right';
}

export function Dropdown({ label, value, options, onChange, align = 'left' }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);
  return (
    <div className="dd" ref={ref}>
      <button className={`dd-btn${open ? ' open' : ''}`} onClick={() => setOpen(o => !o)}>
        {label && <span className="dd-label">{label}</span>}
        <span className="dd-value">{value}</span>
        <Icon name="chevron" size={16} />
      </button>
      {open && (
        <div className={`dd-menu dd-${align}`}>
          {options.map(o => (
            <button key={o} className={`dd-item${o === value ? ' active' : ''}`}
              onClick={() => { onChange(o); setOpen(false); }}>{o}</button>
          ))}
        </div>
      )}
    </div>
  );
}
