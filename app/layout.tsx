import type { Metadata } from 'next';
import './globals.css';
import { Sidebar } from '@/components/layout/Sidebar';
import { BottomNav } from '@/components/layout/BottomNav';
import { AdSlot } from '@/components/ui/AdSlot';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'SNAPCOUNT · Marcadores, standings y stats de la NFL',
    template: '%s · SNAPCOUNT',
  },
  description:
    'Marcadores en vivo de la NFL, standings, brackets de playoffs, rosters y estadísticas de equipos y jugadores. Historial completo de temporadas desde 2002.',
  openGraph: {
    type: 'website',
    siteName: 'SNAPCOUNT',
    locale: 'es_MX',
    title: 'SNAPCOUNT · Marcadores, standings y stats de la NFL',
    description:
      'Marcadores en vivo, playoffs, rosters y estadísticas de la NFL con historial desde 2002.',
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" data-theme="light" data-density="regular" data-tint="on" suppressHydrationWarning>
      <head>
        {/* Apply the saved theme before first paint to avoid a light flash */}
        <script dangerouslySetInnerHTML={{ __html:
          `try{var t=localStorage.getItem('theme');if(t==='dark'||t==='light')document.documentElement.dataset.theme=t}catch(e){}`,
        }} />
      </head>
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
