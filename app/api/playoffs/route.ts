import { NextRequest, NextResponse } from 'next/server';
import { getPlayoffPicture } from '@/lib/services/playoffs';
import { CURRENT_SEASON } from '@/lib/data';

export async function GET(req: NextRequest) {
  const season = req.nextUrl.searchParams.get('season') ?? CURRENT_SEASON;
  const picture = await getPlayoffPicture(season);
  return NextResponse.json(picture);
}
