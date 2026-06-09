'use client';
import { useRouter } from 'next/navigation';
import { Dropdown } from '@/components/controls/Dropdown';
import { SEASONS, TOTAL_WEEKS } from '@/lib/data';

const PLAYOFFS_OPT = 'Playoffs';
interface Props { season: string; week: string | number; }

export function WeekSelector({ season, week }: Props) {
  const router = useRouter();
  const weekOptions = [...Array.from({ length: TOTAL_WEEKS }, (_, i) => `Week ${i + 1}`), PLAYOFFS_OPT];
  const weekValue = week === 'playoffs' ? PLAYOFFS_OPT : `Week ${week}`;

  const setSeason = (s: string) => {
    const w = week === 'playoffs' ? 'playoffs' : week;
    router.push(`/season?season=${s}&week=${w}`);
  };
  const setWeek = (v: string) => {
    const w = v === PLAYOFFS_OPT ? 'playoffs' : v.replace('Week ', '');
    router.push(`/season?season=${season}&week=${w}`);
  };
  return (
    <>
      <Dropdown label="Season" value={season} options={SEASONS} onChange={setSeason} />
      <Dropdown label="Week" value={weekValue} options={weekOptions} onChange={setWeek} align="right" />
    </>
  );
}
