'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface Props {
  href: string;
  id: string;
  children: React.ReactNode;
}

export function SidebarActiveLink({ href, id, children }: Props) {
  const pathname = usePathname();
  const active = id === 'home' ? pathname === '/'
    : id === 'teams' ? pathname.startsWith('/team')
    : id === 'season' ? pathname.startsWith('/season') || pathname.startsWith('/game')
    : false;
  return (
    <Link href={href} className={`nav-item${active ? ' active' : ''}`}>
      {children}
    </Link>
  );
}
