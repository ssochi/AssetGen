'use client';

import Link from 'next/link';
import { useMemo, useState, useTransition } from 'react';
import { PixelPreview } from './pixel-preview';
import { Artwork } from '@/lib/types';
import { likeArtwork } from '@/lib/api';
import { downloadSpriteGif, downloadSpritePng } from '@/lib/exporters';

interface Props {
  artwork: Artwork;
  onUpdate?: (artwork: Artwork) => void;
}

function formatDuration(durationMs: number) {
  if (!durationMs || durationMs < 1000) return `${durationMs} ms`;
  const seconds = durationMs / 1000;
  if (seconds < 60) return `${seconds.toFixed(1)} s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);
  return `${minutes}m ${remainingSeconds}s`;
}

export function ArtworkCard({ artwork, onUpdate }: Props) {
  const [pending, startTransition] = useTransition();
  const [downloadingPng, setDownloadingPng] = useState(false);
  const [downloadingGif, setDownloadingGif] = useState(false);
  const safeSteps = Array.isArray(artwork.steps) ? artwork.steps : [];

  const metadata = useMemo(
    () => ({
      createdAt: new Date(artwork.createdAt).toLocaleString(),
      duration: formatDuration(artwork.durationMs ?? 0),
    }),
    [artwork.createdAt, artwork.durationMs],
  );

  const handleLike = () => {
    startTransition(async () => {
      try {
        const updated = await likeArtwork(artwork.id);
        onUpdate?.(updated);
      } catch (error) {
        console.error(error);
      }
    });
  };

  const filename = artwork.title || 'sprite';

  const handleDownloadPng = async () => {
    if (downloadingPng) return;
    try {
      setDownloadingPng(true);
      await downloadSpritePng(filename, artwork.grid);
    } catch (error) {
      console.error(error);
    } finally {
      setDownloadingPng(false);
    }
  };

  const handleDownloadGif = async () => {
    if (downloadingGif || !safeSteps.length) return;
    try {
      setDownloadingGif(true);
      await downloadSpriteGif({
        filename,
        size: artwork.grid.size,
        palette: artwork.palette,
        steps: safeSteps,
      });
    } catch (error) {
      console.error(error);
    } finally {
      setDownloadingGif(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/5/5 bg-opacity-5 p-4 backdrop-blur">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-white/60">{artwork.model}</p>
          <h3 className="text-xl font-semibold">{artwork.title}</h3>
        </div>
        <button
          onClick={handleLike}
          disabled={pending}
          className="flex items-center gap-1 rounded-full border border-white/20 px-3 py-1 text-sm text-white/70 transition hover:border-white/60 hover:text-white disabled:cursor-not-allowed"
        >
          <span>❤️</span>
          <span>{artwork.likes}</span>
        </button>
      </div>
      <PixelPreview grid={artwork.grid} maxDisplaySize={200} />
      <div className="grid gap-2 text-xs text-white/60 sm:grid-cols-2">
        <p>
          <span className="text-white/40">Creator:</span>@{artwork.authorHandle}
        </p>
        <p>
          <span className="text-white/40">Duration:</span>
          {metadata.duration}
        </p>
        <p>
          <span className="text-white/40">Created:</span>
          <time dateTime={artwork.createdAt}>{metadata.createdAt}</time>
        </p>
        <p>
          <span className="text-white/40">Model:</span>
          {artwork.model}
        </p>
      </div>
      <div className="text-sm text-white/70">
        <p className="font-mono text-xs text-white/50">Prompt</p>
        <p>{artwork.prompt}</p>
      </div>
      <div className="flex flex-wrap gap-2 text-xs text-white/70">
        <button
          type="button"
          onClick={handleDownloadPng}
          disabled={downloadingPng}
          className="rounded-full border border-white/20 px-3 py-1 transition hover:border-brand-400 disabled:cursor-not-allowed"
        >
          {downloadingPng ? 'Exporting PNG...' : 'Download PNG'}
        </button>
        <button
          type="button"
          onClick={handleDownloadGif}
          disabled={downloadingGif || !safeSteps.length}
          className="rounded-full border border-white/20 px-3 py-1 transition hover:border-brand-400 disabled:cursor-not-allowed"
        >
          {downloadingGif ? 'Exporting GIF...' : 'Download GIF'}
        </button>
        <span className="text-white/40">{safeSteps.length ? `${safeSteps.length} steps` : 'No step data'}</span>
        <Link
          href={`/artwork/${artwork.id}`}
          className="rounded-full border border-transparent px-3 py-1 text-white/70 transition hover:text-white"
        >
          View details →
        </Link>
      </div>
    </div>
  );
}
