import { NextRequest, NextResponse } from 'next/server';
import { getStandings } from '@/lib/services/standings';
import { CURRENT_SEASON } from '@/lib/data';

export async function GET(req: NextRequest) {
  const season = req.nextUrl.searchParams.get('season') ?? CURRENT_SEASON;
  const data = await getStandings(season);
  return NextResponse.json(data);
}
