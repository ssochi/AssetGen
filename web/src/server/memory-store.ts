import { createHash, randomUUID } from 'crypto';
import { Artwork, ArtworkKind, LeaderboardEntry, PixelArtStep, PixelColorGrid } from '@/lib/types';

const MAX_ARTWORKS = 10_000;

type ArtworkStore = {
  artworks: Artwork[];
  hashes: Map<string, string>;
};

const globalStore = globalThis as typeof globalThis & { __ASSETGEN_STORE__?: ArtworkStore };

if (!globalStore.__ASSETGEN_STORE__) {
  globalStore.__ASSETGEN_STORE__ = { artworks: [], hashes: new Map() };
}

const store = globalStore.__ASSETGEN_STORE__;

interface ArtworkInput {
  title: string;
  prompt: string;
  model: string;
  authorHandle: string;
  grid: PixelColorGrid;
  previewSvg: string;
  palette: string[];
  steps: PixelArtStep[];
  durationMs: number;
}

function generateId() {
  return randomUUID();
}

function hashArtwork(grid: PixelColorGrid, palette: string[], steps: PixelArtStep[]): string {
  const hash = createHash('sha256');
  hash.update(JSON.stringify(grid));
  hash.update(JSON.stringify(palette));
  hash.update(JSON.stringify(steps));
  return hash.digest('hex');
}

function evictIfNeeded() {
  if (store.artworks.length <= MAX_ARTWORKS) return;
  store.artworks.sort((a, b) => {
    if (a.likes !== b.likes) return a.likes - b.likes;
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });
  while (store.artworks.length > MAX_ARTWORKS) {
    store.artworks.shift();
  }
}

export function listArtworks(): Artwork[] {
  return [...store.artworks].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export function getArtwork(id: string): Artwork | null {
  return store.artworks.find((item) => item.id === id) ?? null;
}

export function addArtwork(payload: ArtworkInput): Artwork {
  const fingerprint = hashArtwork(payload.grid, payload.palette, payload.steps);
  if (store.hashes.has(fingerprint)) {
    const existingId = store.hashes.get(fingerprint)!;
    const existing = getArtwork(existingId);
    if (existing) {
      return existing;
    }
  }
  const now = new Date().toISOString();
  const record: Artwork = {
    id: generateId(),
    kind: 'pixel_image' as ArtworkKind,
    likes: 0,
    createdAt: now,
    ...payload,
  };
  store.artworks = [record, ...store.artworks];
  store.hashes.set(fingerprint, record.id);
  evictIfNeeded();
  return record;
}

export function likeArtwork(id: string): Artwork | null {
  const idx = store.artworks.findIndex((item) => item.id === id);
  if (idx === -1) return null;
  const updated = { ...store.artworks[idx], likes: store.artworks[idx].likes + 1 };
  store.artworks[idx] = updated;
  return updated;
}

export function getLeaderboard(limit = 10): LeaderboardEntry[] {
  return [...store.artworks]
    .sort((a, b) => {
      if (b.likes !== a.likes) return b.likes - a.likes;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    })
    .slice(0, limit)
    .map((item, index) => ({ ...item, rank: index + 1 }));
}

export function resetStore() {
  store.artworks = [];
  store.hashes.clear();
}
