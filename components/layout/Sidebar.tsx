import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { BrandMark } from '@/components/ui/BrandMark';
import { SidebarActiveLink } from './SidebarActiveLink';
import { ThemeToggle } from './ThemeToggle';

const NAV = [
  { id: 'home',   label: 'Home',   icon: 'home'   as const, href: '/' },
  { id: 'teams',  label: 'Teams',  icon: 'teams'  as const, href: '/teams' },
  { id: 'season', label: 'Season', icon: 'season' as const, href: '/season' },
];

export function Sidebar() {
  return (
    <nav className="sidebar">
      <Link href="/" className="brand">
        <BrandMark size={30} />
        <span className="brand-word">SNAPCOUNT</span>
      </Link>
      <div className="nav-items">
        {NAV.map(n => (
          <SidebarActiveLink key={n.id} href={n.href} id={n.id}>
            <Icon name={n.icon} size={22} />
            <span>{n.label}</span>
          </SidebarActiveLink>
        ))}
      </div>
      <div className="sidebar-legal">
        <span className="sidebar-legal-h">Disclaimer</span>
        <p>
          Unofficial app. Not affiliated with or endorsed by the NFL or any of
          its teams. All team names, logos and trademarks are property of their
          respective owners. Data provided by ESPN.
        </p>
      </div>
      <ThemeToggle />
    </nav>
  );
}
