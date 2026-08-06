import { NextRequest, NextResponse } from 'next/server';
import { getScoreboard, getLiveGames, getCurrentWeek } from '@/lib/services/scoreboard';
import { CURRENT_SEASON } from '@/lib/data';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const week   = searchParams.get('week');
  const season = searchParams.get('season') ?? CURRENT_SEASON;
  const status = searchParams.get('status');

  let weekNum: number | null = null;
  if (week && week !== 'live') {
    weekNum = parseInt(week, 10);
    if (Number.isNaN(weekNum) || weekNum < 1 || weekNum > 22) {
      return NextResponse.json({ error: 'week must be between 1 and 22' }, { status: 400 });
    }
  }

  try {
    let games = week === 'live'
      ? await getLiveGames(season)
      : await getScoreboard(weekNum ?? await getCurrentWeek(season), season);

    if (status) games = games.filter(g => g.status === status);

    return NextResponse.json(games);
  } catch (err) {
    console.error('[api/games]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
