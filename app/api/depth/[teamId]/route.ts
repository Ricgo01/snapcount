import { NextRequest, NextResponse } from 'next/server';
import { getDepthChart } from '@/lib/services/depth-chart';
import { CURRENT_SEASON } from '@/lib/data';

export async function GET(req: NextRequest, { params }: { params: Promise<{ teamId: string }> }) {
  try {
    const { teamId } = await params;
    const season = req.nextUrl.searchParams.get('season') ?? CURRENT_SEASON;
    return NextResponse.json(await getDepthChart(teamId, season));
  } catch (err) {
    console.error('[api/depth]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
