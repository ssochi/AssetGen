import { NextResponse } from 'next/server';
import { getArtwork } from '@/server/memory-store';

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const artwork = getArtwork(params.id);
  if (!artwork) {
    return NextResponse.json({ error: 'Artwork not found' }, { status: 404 });
  }
  return NextResponse.json(artwork);
}
