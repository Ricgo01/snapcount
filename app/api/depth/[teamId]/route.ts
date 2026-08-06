import { NextRequest, NextResponse } from 'next/server';
import { getDepthChart } from '@/lib/services/depth-chart';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ teamId: string }> }) {
  try {
    const { teamId } = await params;
    return NextResponse.json(await getDepthChart(teamId));
  } catch (err) {
    console.error('[api/depth]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
