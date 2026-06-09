import { teamDepthChart } from '@/lib/data';
import { DepthChartClient } from './DepthChartClient';

interface Props { teamId: string; }

export function DepthChart({ teamId }: Props) {
  const groups = teamDepthChart(teamId);
  return <DepthChartClient groups={groups} />;
}
