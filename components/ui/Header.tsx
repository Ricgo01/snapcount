import type { ReactNode } from 'react';
import Link from 'next/link';
import { Icon } from './Icon';

interface Props {
  title: string;
  subtitle?: string;
  onBack?: string;
  children?: ReactNode;
}

export function Header({ title, subtitle, onBack, children }: Props) {
  return (
    <header className="page-header">
      <div className="ph-main">
        {onBack && (
          <Link href={onBack} className="ph-back" aria-label="Volver">
            <Icon name="back" size={20} />
          </Link>
        )}
        <div className="ph-titles">
          <h1 className="ph-title">{title}</h1>
          {subtitle && <p className="ph-sub">{subtitle}</p>}
        </div>
      </div>
      {children && <div className="ph-controls">{children}</div>}
    </header>
  );
}
