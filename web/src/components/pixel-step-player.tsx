'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PixelArtStep, PixelStroke } from '@/lib/types';
import { buildTimelineEvents, TimelineEvent } from '@/lib/steps';

interface Props {
  size: number;
  palette: string[];
  steps: PixelArtStep[];
  pixelSize?: number;
  speed?: number;
  onSpeedChange?: (value: number) => void;
}

function clampColorIndex(index: number, paletteLength: number): number {
  if (paletteLength <= 0) return 0;
  const normalized = index % paletteLength;
  return normalized < 0 ? normalized + paletteLength : normalized;
}

export function PixelStepPlayer({ size, palette, steps, pixelSize, speed, onSpeedChange }: Props) {
  const fallbackColor = palette[0] ?? '#000000';
  const resolvedPixelSize = useMemo(() => {
    const autoSize = Math.max(3, Math.floor(320 / Math.max(size, 1)));
    return Math.max(2, pixelSize ?? autoSize);
  }, [pixelSize, size]);

  const createBlankGrid = useCallback(() => {
    return Array.from({ length: size }, () => Array(size).fill(fallbackColor));
  }, [size, fallbackColor]);

  const [grid, setGrid] = useState<string[][]>(() => createBlankGrid());
  const [pointer, setPointer] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [internalSpeed, setInternalSpeed] = useState(40);
  const [paintedPixels, setPaintedPixels] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const effectiveSpeed = speed ?? internalSpeed;

  const timeline: TimelineEvent[] = useMemo(() => buildTimelineEvents(steps), [steps]);

  const totalEvents = timeline.length;
  const totalPixels = useMemo(
    () => timeline.reduce((sum, item) => sum + item.strokes.length, 0),
    [timeline],
  );
  const totalSteps = steps.length;

  useEffect(() => {
    setGrid(createBlankGrid());
    setPointer(0);
    setPaintedPixels(0);
    setIsPlaying(false);
  }, [createBlankGrid, steps]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const paintStrokes = useCallback(
    (strokes: PixelStroke[]) => {
      if (!strokes.length) return;
      setGrid((prev) => {
        const next = prev.map((row) => row.slice());
        strokes.forEach((stroke) => {
          if (
            stroke.x < 0 ||
            stroke.x >= size ||
            stroke.y < 0 ||
            stroke.y >= size ||
            Number.isNaN(stroke.x) ||
            Number.isNaN(stroke.y)
          ) {
            return;
          }
          const safeIndex = clampColorIndex(stroke.ci ?? 0, palette.length);
          const color = palette[safeIndex] ?? fallbackColor;
          next[stroke.y][stroke.x] = color;
        });
        return next;
      });
    },
    [palette, size, fallbackColor],
  );

  const advanceOne = useCallback(() => {
    if (!timeline.length) return;
    setPointer((prev) => {
      if (prev >= timeline.length) {
        return prev;
      }
      const item = timeline[prev];
      if (item) {
        paintStrokes(item.strokes);
        setPaintedPixels((count) => count + item.strokes.length);
      }
      const nextPointer = prev + 1;
      if (nextPointer >= timeline.length) {
        setIsPlaying(false);
      }
      return nextPointer;
    });
  }, [timeline, paintStrokes]);

  useEffect(() => {
    if (!isPlaying) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }
    if (!timeline.length || pointer >= timeline.length) {
      setIsPlaying(false);
      return;
    }
    intervalRef.current = setInterval(() => {
      advanceOne();
    }, effectiveSpeed);
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [advanceOne, isPlaying, pointer, effectiveSpeed, timeline.length]);

  useEffect(() => {
    if (typeof speed === 'number') {
      setInternalSpeed(speed);
    }
  }, [speed]);

  const handlePlayPause = () => {
    if (!timeline.length) return;
    if (pointer >= timeline.length) {
      setGrid(createBlankGrid());
      setPointer(0);
      setPaintedPixels(0);
    }
    setIsPlaying((prev) => !prev);
  };

  const handleReset = () => {
    setIsPlaying(false);
    setGrid(createBlankGrid());
    setPointer(0);
    setPaintedPixels(0);
  };

  const handleSpeedChange = (value: number) => {
    if (typeof speed !== 'number') {
      setInternalSpeed(value);
    }
    onSpeedChange?.(value);
  };

  const currentStepIndex = useMemo(() => {
    if (!timeline.length) return 0;
    if (pointer === 0) return 0;
    const latest = timeline[Math.min(pointer - 1, timeline.length - 1)];
    return latest?.stepIndex ?? 0;
  }, [pointer, timeline]);

  const currentDescription = steps[currentStepIndex]?.description ?? '';
  const progressText = totalEvents
    ? `Frames ${pointer}/${totalEvents} · Pixels ${paintedPixels}/${totalPixels} · Step ${Math.min(currentStepIndex + 1, totalSteps)}/${Math.max(totalSteps, 1)}`
    : 'No steps available yet';

  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <p className="text-xs uppercase tracking-[0.3em] text-white/50">Playback</p>
        <p className="text-xs text-white/60">{progressText}</p>
      </div>
      <div className="mt-4 flex flex-col gap-4 lg:flex-row">
        <div className="rounded-xl border border-white/10 bg-black/40 p-4 overflow-auto">
          <div
            className="inline-grid"
            style={{
              gridTemplateColumns: `repeat(${size}, ${resolvedPixelSize}px)`,
              gap: 0,
            }}
          >
            {grid.map((row, y) =>
              row.map((color, x) => (
                <span
                  key={`${x}-${y}`}
                  className="aspect-square"
                  style={{ width: resolvedPixelSize, height: resolvedPixelSize, backgroundColor: color }}
                />
              )),
            )}
          </div>
        </div>
        <div className="flex flex-1 flex-col gap-3">
          <div>
            <p className="text-sm font-semibold text-white">Current step</p>
            <p className="text-sm text-white/70">
              {totalSteps ? currentDescription || '(no description)' : 'Awaiting generation'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handlePlayPause}
              disabled={!totalEvents}
              className="rounded-full border border-white/20 px-4 py-2 text-sm text-white/80 transition hover:border-brand-400 disabled:cursor-not-allowed disabled:border-white/10"
            >
              {isPlaying ? 'Pause' : 'Play'}
            </button>
            <button
              type="button"
              onClick={advanceOne}
              disabled={!totalEvents || pointer >= totalEvents}
              className="rounded-full border border-white/20 px-4 py-2 text-sm text-white/80 transition hover:border-brand-400 disabled:cursor-not-allowed disabled:border-white/10"
            >
              Step once
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="rounded-full border border-white/20 px-4 py-2 text-sm text-white/80 transition hover:border-brand-400"
            >
              Reset
            </button>
          </div>
          <label className="text-xs text-white/60">
            Animation speed ({effectiveSpeed}ms / pixel)
            <input
              type="range"
              min={10}
              max={400}
              step={10}
              value={effectiveSpeed}
              onChange={(e) => handleSpeedChange(parseInt(e.target.value, 10))}
              className="mt-2 w-full"
            />
          </label>
        </div>
      </div>
    </div>
  );
}
