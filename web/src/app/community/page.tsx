'use client';

import { useCallback, useEffect, useState } from 'react';
import { Artwork } from '@/lib/types';
import { ArtworkCard } from '@/components/artwork-card';
import { fetchArtworks } from '@/lib/api';
import { ArtworkModal } from '@/components/artwork-modal';

export default function CommunityPage() {
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [selected, setSelected] = useState<Artwork | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const items = await fetchArtworks();
      setArtworks(items);
    } catch (err) {
      console.error(err);
      setError('Could not load community artworks, please try again later.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <header className="mb-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-white/60">Community</p>
          <h1 className="text-3xl font-semibold">Latest sprites & inspiration</h1>
          <p className="text-white/70">Browse everything the community uploads, like your favorites, and learn from their prompts.</p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={isLoading}
          className="rounded-full border border-white/30 px-5 py-2 text-sm text-white/80 transition hover:border-brand-400 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Loading...' : 'Refresh'}
        </button>
      </header>

      {error && <p className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</p>}

      {isLoading && !artworks.length ? (
        <div className="rounded-2xl border border-dashed border-white/20 p-8 text-center text-white/60">Fetching sprites...</div>
      ) : artworks.length ? (
        <div className="grid gap-6 md:grid-cols-2">
          {artworks.map((art) => (
            <ArtworkCard
              key={art.id}
              artwork={art}
              onUpdate={(updated) =>
                setArtworks((prev) => prev.map((item) => (item.id === updated.id ? updated : item)))
              }
              onViewDetails={setSelected}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-white/20 p-8 text-center text-white/60">
          No one has published yet—be the first to share your sprite!
        </div>
      )}

      {selected && <ArtworkModal artwork={selected} onClose={() => setSelected(null)} />}
    </main>
  );
}
