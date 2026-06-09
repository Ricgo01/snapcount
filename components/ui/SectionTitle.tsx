import type { ReactNode } from 'react';

interface Props { children: ReactNode; right?: ReactNode; }

export function SectionTitle({ children, right }: Props) {
  return (
    <div className="section-title">
      <h2>{children}</h2>
      {right}
    </div>
  );
}
