import { NextRequest, NextResponse } from 'next/server';
import { TEAMS } from '@/lib/data';
import type { Conference, Division } from '@/types/nfl';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const conf = searchParams.get('conf') as Conference | null;
  const div  = searchParams.get('div') as Division | null;
  let result = TEAMS;
  if (conf) result = result.filter(t => t.conf === conf);
  if (div)  result = result.filter(t => t.div === div);
  return NextResponse.json(result);
}
