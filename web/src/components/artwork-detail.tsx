'use client';

import { useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { Artwork } from '@/lib/types';
import { downloadSpriteGif, downloadSpritePng } from '@/lib/exporters';
import { PixelPreview } from './pixel-preview';
import { PixelStepPlayer } from './pixel-step-player';
import { likeArtwork } from '@/lib/api';

function formatDuration(durationMs: number) {
  if (!durationMs) return 'Unknown';
  if (durationMs < 1000) return `${durationMs} ms`;
  const seconds = durationMs / 1000;
  if (seconds < 60) return `${seconds.toFixed(1)} s`;
  const minutes = Math.floor(seconds / 60);
  const remain = Math.round(seconds % 60);
  return `${minutes}m ${remain}s`;
}

interface Props {
  artwork: Artwork;
}

export function ArtworkDetail({ artwork }: Props) {
  const [current, setCurrent] = useState(artwork);
  const [downloadingPng, setDownloadingPng] = useState(false);
  const [downloadingGif, setDownloadingGif] = useState(false);
  const [liking, startTransition] = useTransition();
  const [animationSpeed, setAnimationSpeed] = useState(40);
  const safeSteps = Array.isArray(current.steps) ? current.steps : [];
  const palette = Array.isArray(current.palette) ? current.palette : [];

  const metadata = useMemo(
    () => ({
      createdAt: new Date(current.createdAt).toLocaleString(),
      duration: formatDuration(current.durationMs ?? 0),
    }),
    [current.createdAt, current.durationMs],
  );

  const filename = current.title || 'sprite';

  const handleDownloadPng = async () => {
    if (downloadingPng) return;
    try {
      setDownloadingPng(true);
      await downloadSpritePng(filename, current.grid, 16);
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
        size: current.grid.size,
        palette,
        steps: safeSteps,
        delayMs: animationSpeed,
      });
    } finally {
      setDownloadingGif(false);
    }
  };

  const handleLike = () => {
    startTransition(async () => {
      try {
        const updated = await likeArtwork(current.id);
        setCurrent(updated);
      } catch (error) {
        console.error(error);
      }
    });
  };

  return (
    <section className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-white/60">{current.model}</p>
          <h1 className="text-3xl font-semibold text-white">{current.title}</h1>
          <p className="text-sm text-white/60">@{current.authorHandle}</p>
        </div>
        <button
          onClick={handleLike}
          disabled={liking}
          className="flex items-center gap-2 rounded-full border border-white/30 px-4 py-2 text-sm text-white/80 transition hover:border-brand-400 disabled:cursor-not-allowed"
        >
          <span>❤️</span>
          <span>{current.likes}</span>
          <span className="text-white/50">Like</span>
        </button>
      </div>

      <PixelPreview grid={current.grid} maxDisplaySize={360} />

      <div className="grid gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/70 md:grid-cols-2">
        <p><span className="text-white/40">Created:</span> {metadata.createdAt}</p>
        <p><span className="text-white/40">Duration:</span> {metadata.duration}</p>
        <p><span className="text-white/40">Grid:</span> {current.grid.size}×{current.grid.size}</p>
        <p><span className="text-white/40">Model:</span> {current.model}</p>
      </div>

      <div className="text-sm text-white/70">
        <p className="font-mono text-xs text-white/50">Prompt</p>
        <p className="mt-2 whitespace-pre-line">{current.prompt}</p>
      </div>

      {palette.length > 0 && (
        <div className="text-sm text-white/70">
          <p className="font-semibold">Palette</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {palette.map((color) => (
              <span key={color} className="flex items-center gap-2 rounded-full border border-white/10 px-3 py-1 text-xs">
                <span className="h-4 w-4 rounded-full" style={{ backgroundColor: color }} />
                {color}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-3 text-sm text-white/80">
        <button
          type="button"
          onClick={handleDownloadPng}
          disabled={downloadingPng}
          className="rounded-full border border-white/30 px-4 py-2 transition hover:border-brand-400 disabled:cursor-not-allowed"
        >
          {downloadingPng ? 'Exporting PNG...' : 'Download PNG'}
        </button>
        <button
          type="button"
          onClick={handleDownloadGif}
          disabled={downloadingGif || !safeSteps.length}
          className="rounded-full border border-white/30 px-4 py-2 transition hover:border-brand-400 disabled:cursor-not-allowed"
        >
          {downloadingGif ? 'Exporting GIF...' : safeSteps.length ? 'Download GIF' : 'No GIF available'}
        </button>
        <Link
          href="/community"
          className="rounded-full border border-white/20 px-4 py-2 text-sm text-white/70 transition hover:border-white/60"
        >
          Back to community
        </Link>
      </div>

      {safeSteps.length > 0 ? (
        <div className="space-y-4">
          <PixelStepPlayer
            size={current.grid.size}
            palette={palette}
            steps={safeSteps}
            speed={animationSpeed}
            onSpeedChange={setAnimationSpeed}
          />
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
            <p className="font-semibold">Painting steps</p>
            <ol className="mt-3 space-y-2">
              {safeSteps.map((step, index) => (
                <li key={`${current.id}-step-${index}`} className="rounded-xl border border-white/10 bg-black/20 p-3">
                  <p className="text-white">
                    Step {index + 1}: {step.description || '(no description)'}
                  </p>
                  <p className="text-xs text-white/50">Pixels changed: {step.pixels.length}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      ) : (
        <p className="text-sm text-white/60">No step information available for this artwork.</p>
      )}
    </section>
  );
}
