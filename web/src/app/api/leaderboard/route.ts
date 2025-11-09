import { NextResponse } from 'next/server';
import { getLeaderboard } from '@/server/memory-store';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = Number(searchParams.get('limit') ?? '10');
  const safeLimit = Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 100) : 10;
  const leaderboard = getLeaderboard(safeLimit);
  return NextResponse.json(leaderboard);
}
