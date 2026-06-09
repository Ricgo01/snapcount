'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon } from '@/components/ui/Icon';

const NAV = [
  { id: 'home',   label: 'Home',   icon: 'home'   as const, href: '/' },
  { id: 'teams',  label: 'Teams',  icon: 'teams'  as const, href: '/teams' },
  { id: 'season', label: 'Season', icon: 'season' as const, href: '/season' },
];

export function BottomNav() {
  const pathname = usePathname();
  const active = (id: string) =>
    id === 'home' ? pathname === '/'
    : id === 'teams' ? pathname.startsWith('/team')
    : id === 'season' ? pathname.startsWith('/season') || pathname.startsWith('/game')
    : false;

  return (
    <nav className="bottom-nav">
      {NAV.map(n => (
        <Link key={n.id} href={n.href} className={`bn-item${active(n.id) ? ' active' : ''}`}>
          <Icon name={n.icon} size={22} />
          <span>{n.label}</span>
        </Link>
      ))}
    </nav>
  );
}
