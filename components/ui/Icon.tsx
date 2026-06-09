type IconName = 'home' | 'teams' | 'season' | 'playoffs' | 'chevron' | 'back' | 'play' | 'pin' | 'menu' | 'close';
interface IconProps { name: IconName; size?: number; }

export function Icon({ name, size = 22 }: IconProps) {
  const p = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  switch (name) {
    case 'home':
      return <svg {...p}><path d="M3 11.5 12 4l9 7.5" /><path d="M5 10v9a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-9" /></svg>;
    case 'teams':
      return <svg {...p}><circle cx="9" cy="8" r="3" /><circle cx="17" cy="9.5" r="2.2" /><path d="M3.5 19c.6-3 2.8-4.5 5.5-4.5S14 16 14.5 19" /><path d="M15.5 18.8c.4-1.8 1.3-3 3-3s2.6 1 3 2.6" /></svg>;
    case 'season':
      return <svg {...p}><rect x="3.5" y="4.5" width="17" height="16" rx="2.2" /><path d="M3.5 9h17M8 3v3M16 3v3" /></svg>;
    case 'playoffs':
      return <svg {...p}><path d="M7 4h10v3.5a5 5 0 0 1-10 0Z" /><path d="M7 5.5H4.2v1A3 3 0 0 0 7 9.5M17 5.5h2.8v1a3 3 0 0 1-2.8 3" /><path d="M12 12.5V16M9.5 20h5M10 16.5h4V20h-4Z" /></svg>;
    case 'chevron':
      return <svg {...p}><path d="m6 9 6 6 6-6" /></svg>;
    case 'back':
      return <svg {...p}><path d="m15 18-6-6 6-6" /></svg>;
    case 'play':
      return <svg {...p} fill="currentColor" stroke="none"><path d="M8 5.5v13l11-6.5z" /></svg>;
    case 'pin':
      return <svg {...p}><path d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11Z" /><circle cx="12" cy="10" r="2.5" /></svg>;
    case 'menu':
      return <svg {...p}><path d="M4 7h16M4 12h16M4 17h16" /></svg>;
    case 'close':
      return <svg {...p}><path d="M6 6l12 12M18 6 6 18" /></svg>;
    default:
      return null;
  }
}
