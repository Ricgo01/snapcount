'use client';
import { useRouter } from 'next/navigation';
import { Dropdown } from '@/components/controls/Dropdown';
import { SEASONS } from '@/lib/data';

interface Props {
  teamId: string;
  season: string;
}

export function SeasonPicker({ teamId, season }: Props) {
  const router = useRouter();
  return (
    <div className="detail-controls">
      <Dropdown
        label="Season"
        value={season}
        options={SEASONS}
        onChange={s => router.push(`/team/${teamId}?season=${s}`)}
      />
    </div>
  );
}
