import { NextRequest, NextResponse } from 'next/server';
import { teamDepthChart } from '@/lib/data';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;
  return NextResponse.json(teamDepthChart(teamId));
}
