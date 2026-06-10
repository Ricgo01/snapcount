import type { DepthGroup } from '@/types/nfl';
import { DepthChartClient } from './DepthChartClient';

// Data is fetched server-side in app/team/[id]/page.tsx and passed as a prop.
interface Props { groups: DepthGroup[]; }

export function DepthChart({ groups }: Props) {
  return <DepthChartClient groups={groups} />;
}
