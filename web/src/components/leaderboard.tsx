'use client';

import { LeaderboardEntry } from '@/lib/types';
import { PixelPreview } from './pixel-preview';

interface Props {
  entries: LeaderboardEntry[];
  onSelect?: (entry: LeaderboardEntry) => void;
}

function formatDuration(durationMs: number) {
  if (!durationMs) return 'Unknown duration';
  if (durationMs < 1000) return `${durationMs} ms`;
  const seconds = durationMs / 1000;
  if (seconds < 60) return `${seconds.toFixed(1)} s`;
  const minutes = Math.floor(seconds / 60);
  const remain = Math.round(seconds % 60);
  return `${minutes}m ${remain}s`;
}

export function Leaderboard({ entries, onSelect }: Props) {
  if (!entries.length) {
    return (
      <div className="rounded-2xl border border-white/10 bg-black/30 p-6 text-white/60">
        Leaderboard will appear once the first sprites are published.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {entries.map((entry) => (
        <div
          key={entry.id}
          className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/0 p-5 md:flex-row md:items-center"
        >
          <div className="flex items-center gap-4">
            <div className="text-3xl font-black text-brand-400">#{entry.rank}</div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-white/60">{entry.model}</p>
              <h3 className="text-lg font-semibold">{entry.title}</h3>
              <p className="text-sm text-white/60">@{entry.authorHandle}</p>
            </div>
          </div>
          <div className="flex flex-1 justify-end">
            <PixelPreview grid={entry.grid} maxDisplaySize={160} />
          </div>
          <div className="text-right text-white/80">
            <p className="text-sm">{entry.likes} likes</p>
            <p className="text-xs text-white/50">{new Date(entry.createdAt).toLocaleDateString()}</p>
            <p className="text-xs text-white/50">Duration {formatDuration(entry.durationMs)}</p>
            {onSelect && (
              <button
                type="button"
                onClick={() => onSelect(entry)}
                className="mt-2 inline-flex text-xs text-brand-300 hover:text-brand-200"
              >
                View details →
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
