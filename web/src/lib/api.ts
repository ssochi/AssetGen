import { Artwork, LeaderboardEntry, PixelArtStep, PixelColorGrid } from './types';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? '';

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.error ?? 'Unexpected API error');
  }
  return res.json() as Promise<T>;
}

export async function fetchArtworks(): Promise<Artwork[]> {
  const res = await fetch(`${API_BASE}/api/artworks`, { next: { revalidate: 0 } });
  return handleResponse<Artwork[]>(res);
}

export async function createArtwork(payload: {
  title: string;
  prompt: string;
  model: string;
  authorHandle: string;
  grid: PixelColorGrid;
  previewSvg: string;
  palette: string[];
  steps: PixelArtStep[];
  durationMs: number;
}): Promise<Artwork> {
  const res = await fetch(`${API_BASE}/api/artworks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      kind: 'pixel_image',
      ...payload,
    }),
  });
  return handleResponse<Artwork>(res);
}

export async function likeArtwork(id: string): Promise<Artwork> {
  const res = await fetch(`${API_BASE}/api/artworks/${id}/like`, { method: 'POST' });
  return handleResponse<Artwork>(res);
}

export async function fetchLeaderboard(limit = 10): Promise<LeaderboardEntry[]> {
  const res = await fetch(`${API_BASE}/api/leaderboard?limit=${limit}`, { next: { revalidate: 0 } });
  return handleResponse<LeaderboardEntry[]>(res);
}
