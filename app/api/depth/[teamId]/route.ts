import { NextRequest, NextResponse } from 'next/server';
import { getDepthChart } from '@/lib/services/depth-chart';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;
  return NextResponse.json(await getDepthChart(teamId));
}
