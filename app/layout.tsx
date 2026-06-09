import type { Metadata } from 'next';
import './globals.css';
import { Sidebar } from '@/components/layout/Sidebar';
import { BottomNav } from '@/components/layout/BottomNav';
import { AdSlot } from '@/components/ui/AdSlot';

export const metadata: Metadata = {
  title: 'GRIDIRON · NFL',
  description: 'NFL schedule, standings, and stats',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" data-theme="light" data-density="regular" data-tint="off">
      <body>
        <div className="app">
          <Sidebar />
          <main className="content">
            {children}
          </main>
          <div className="gx-promo-rail">
            <AdSlot variant="sidebar" />
          </div>
          <BottomNav />
        </div>
      </body>
    </html>
  );
}
