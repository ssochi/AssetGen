'use client';

import { useCallback, useEffect, useState } from 'react';
import { fetchLeaderboard } from '@/lib/api';
import { LeaderboardEntry } from '@/lib/types';
import { Leaderboard } from '@/components/leaderboard';
import { ArtworkModal } from '@/components/artwork-modal';

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [selected, setSelected] = useState<LeaderboardEntry | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await fetchLeaderboard(10);
      setEntries(data);
    } catch (err) {
      console.error(err);
      setError('Unable to fetch leaderboard data.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <header className="mb-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-white/60">Leaderboard</p>
          <h1 className="text-3xl font-semibold">Top creators & model rankings</h1>
          <p className="text-white/70">Track the most-liked sprites in real time and see which models are delivering hits.</p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={isLoading}
          className="rounded-full border border-white/30 px-5 py-2 text-sm text-white/80 transition hover:border-brand-400 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Syncing...' : 'Refresh board'}
        </button>
      </header>

      {error && <p className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</p>}

      {isLoading && !entries.length ? (
        <div className="rounded-2xl border border-dashed border-white/20 p-8 text-center text-white/60">Loading leaderboard...</div>
      ) : (
        <Leaderboard entries={entries} onSelect={(entry) => setSelected(entry)} />
      )}

      {selected && <ArtworkModal artwork={selected} onClose={() => setSelected(null)} />}
    </main>
  );
}
