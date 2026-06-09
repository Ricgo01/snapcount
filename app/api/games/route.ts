import { NextRequest, NextResponse } from 'next/server';
import { getScoreboard, getLiveGames } from '@/lib/services/scoreboard';
import { CURRENT_SEASON, CURRENT_WEEK } from '@/lib/data';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const week   = searchParams.get('week');
  const season = searchParams.get('season') ?? CURRENT_SEASON;
  const status = searchParams.get('status');

  let games = week === 'live'
    ? await getLiveGames(season)
    : await getScoreboard(week ? parseInt(week, 10) : CURRENT_WEEK, season);

  if (status) games = games.filter(g => g.status === status);

  return NextResponse.json(games);
}
