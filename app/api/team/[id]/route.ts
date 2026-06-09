import { NextRequest, NextResponse } from 'next/server';
import { getTeamDetail } from '@/lib/services/team-detail';
import { CURRENT_SEASON } from '@/lib/data';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const season = _req.nextUrl.searchParams.get('season') ?? CURRENT_SEASON;
  const detail = await getTeamDetail(id, season);
  if (!detail) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(detail);
}
