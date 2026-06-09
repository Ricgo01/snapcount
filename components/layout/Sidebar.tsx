import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { SidebarActiveLink } from './SidebarActiveLink';
import { CURRENT_SEASON } from '@/lib/data';

const NAV = [
  { id: 'home',   label: 'Home',   icon: 'home'   as const, href: '/' },
  { id: 'teams',  label: 'Teams',  icon: 'teams'  as const, href: '/teams' },
  { id: 'season', label: 'Season', icon: 'season' as const, href: '/season' },
];

export function Sidebar() {
  return (
    <nav className="sidebar">
      <Link href="/" className="brand">
        <span className="brand-mark" />
        <span className="brand-word">GRIDIRON</span>
      </Link>
      <div className="nav-items">
        {NAV.map(n => (
          <SidebarActiveLink key={n.id} href={n.href} id={n.id}>
            <Icon name={n.icon} size={22} />
            <span>{n.label}</span>
          </SidebarActiveLink>
        ))}
      </div>
      <div className="sidebar-foot">Datos de ejemplo · {CURRENT_SEASON}</div>
    </nav>
  );
}
