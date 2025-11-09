import { NextResponse } from 'next/server';
import { addArtwork, listArtworks } from '@/server/memory-store';
import { PixelArtStep, PixelColorGrid } from '@/lib/types';

export async function GET() {
  return NextResponse.json(listArtworks());
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      title: string;
      prompt: string;
      model: string;
      authorHandle: string;
      grid: PixelColorGrid;
      previewSvg: string;
      palette: string[];
      steps: PixelArtStep[];
      durationMs: number;
    };

    if (!body.title || !body.prompt || !body.model || !body.authorHandle) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const artwork = addArtwork({
      title: body.title,
      prompt: body.prompt,
      model: body.model,
      authorHandle: body.authorHandle,
      grid: body.grid,
      previewSvg: body.previewSvg,
      palette: Array.isArray(body.palette) ? body.palette : [],
      steps: Array.isArray(body.steps) ? body.steps : [],
      durationMs: Number.isFinite(body.durationMs) ? body.durationMs : 0,
    });

    return NextResponse.json(artwork, { status: 201 });
  } catch (error) {
    console.error('Failed to create artwork', error);
    return NextResponse.json({ error: 'Failed to create artwork' }, { status: 500 });
  }
}
