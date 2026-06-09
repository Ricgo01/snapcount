import { NextResponse } from 'next/server';
import { playoffPicture } from '@/lib/data';

export async function GET() {
  return NextResponse.json(playoffPicture());
}
