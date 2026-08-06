import { NextRequest, NextResponse } from 'next/server';
import { getPlayoffPicture } from '@/lib/services/playoffs';
import { CURRENT_SEASON } from '@/lib/data';

export async function GET(req: NextRequest) {
  try {
    const season = req.nextUrl.searchParams.get('season') ?? CURRENT_SEASON;
    const picture = await getPlayoffPicture(season);
    return NextResponse.json(picture);
  } catch (err) {
    console.error('[api/playoffs]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
