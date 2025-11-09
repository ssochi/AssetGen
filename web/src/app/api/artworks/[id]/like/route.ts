import { NextResponse } from 'next/server';
import { likeArtwork } from '@/server/memory-store';

export async function POST(_: Request, { params }: { params: { id: string } }) {
  const updated = likeArtwork(params.id);
  if (!updated) {
    return NextResponse.json({ error: 'Artwork not found' }, { status: 404 });
  }
  return NextResponse.json(updated);
}
