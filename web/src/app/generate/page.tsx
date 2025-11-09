'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GeneratedPixelArt, ModelSummary } from '@/lib/types';
import { buildSvg, fetchOpenRouterModels, generatePixelArt } from '@/lib/openrouter';
import { createArtwork } from '@/lib/api';
import { useLocalConfig } from '@/lib/use-local-config';
import { PixelPreview } from '@/components/pixel-preview';
import { PixelStepPlayer } from '@/components/pixel-step-player';
import { downloadSpriteGif, downloadSpritePng } from '@/lib/exporters';

const FALLBACK_MODELS: ModelSummary[] = [
  { id: 'meta-llama/Meta-Llama-3.1-8B-Instruct', name: 'Llama 3.1 8B (fast)' },
  { id: 'meta-llama/Meta-Llama-3.1-70B-Instruct', name: 'Llama 3.1 70B (quality)' },
  { id: 'mistralai/mistral-large-2411', name: 'Mistral Large 2' },
];

const HERO_TAGLINES = [
  'Benchmark multiple models’ pixel skills in one shot.',
  'Watch reasoning text and final JSON stream in real time.',
  'Find the perfect model combo for your next leaderboard run.',
];

type RunStatus = 'running' | 'completed' | 'error' | 'cancelled';

interface ModelRunState {
  modelId: string;
  streamedText: string;
  status: RunStatus;
  result?: GeneratedPixelArt;
  title: string;
  previewSvg?: string;
  error?: string;
  statusMessage?: string;
  isPublishing: boolean;
  isExportingPng: boolean;
  isExportingGif: boolean;
  durationMs?: number;
  animationSpeed: number;
  startedAt: number;
}

const STATUS_STYLE: Record<RunStatus, { label: string; className: string }> = {
  running: { label: 'Generating', className: 'bg-amber-400/20 text-amber-200' },
  completed: { label: 'Completed', className: 'bg-emerald-400/20 text-emerald-200' },
  error: { label: 'Error', className: 'bg-red-500/20 text-red-200' },
  cancelled: { label: 'Cancelled', className: 'bg-white/10 text-white/70' },
};

const defaultTitleForModel = (modelId: string) => {
  const parts = modelId.split('/');
  return `Sprite · ${parts[parts.length - 1] ?? modelId}`;
};

const getModelLabel = (model: ModelSummary) => model.name ?? model.id;

export default function GeneratePage() {
  const { config, setConfig } = useLocalConfig();
  const [prompt, setPrompt] = useState('car');
  const [gridSize, setGridSize] = useState(64);
  const [paletteLimit, setPaletteLimit] = useState(20);
  const [models, setModels] = useState<ModelSummary[]>(FALLBACK_MODELS);
  const [selectedModels, setSelectedModels] = useState<string[]>([FALLBACK_MODELS[0].id]);
  const [modelQuery, setModelQuery] = useState('');
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [modelError, setModelError] = useState('');
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [runs, setRuns] = useState<Record<string, ModelRunState>>({});
  const controllersRef = useRef<Record<string, AbortController>>({});
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const loadModels = useCallback(async () => {
    setIsLoadingModels(true);
    try {
      const remote = await fetchOpenRouterModels(config.apiKey || undefined);
      if (remote.length) {
        setModels(remote);
        setModelError('');
      } else {
        setModels(FALLBACK_MODELS);
        setModelError('OpenRouter returned no models, using the fallback list.');
      }
    } catch (error) {
      console.error('Failed to fetch models', error);
      setModels(FALLBACK_MODELS);
      setModelError('Failed to reach OpenRouter, showing fallback models.');
    } finally {
      setIsLoadingModels(false);
    }
  }, [config.apiKey]);

  useEffect(() => {
    void loadModels();
  }, [loadModels]);

  useEffect(() => {
    setSelectedModels((prev) => {
      const next = prev.filter((id) => models.some((option) => option.id === id));
      if (next.length) return next;
      return models[0] ? [models[0].id] : [];
    });
  }, [models]);

useEffect(() => {
  return () => {
    Object.values(controllersRef.current).forEach((controller) => controller.abort());
  };
}, []);

  useEffect(() => {
    if (!toastMessage) return;
    const timer = window.setTimeout(() => setToastMessage(null), 3000);
    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  const filteredModels = useMemo(() => {
    if (!modelQuery.trim()) return models;
    const q = modelQuery.trim().toLowerCase();
    return models.filter((option) => {
      const name = option.name?.toLowerCase() ?? '';
      const id = option.id.toLowerCase();
      return name.includes(q) || id.includes(q);
    });
  }, [modelQuery, models]);

  const orderedRuns = useMemo(() => {
    return Object.values(runs).sort((a, b) => b.startedAt - a.startedAt);
  }, [runs]);

  const activeRunCount = useMemo(() => orderedRuns.filter((run) => run.status === 'running').length, [orderedRuns]);

  const heroText = useMemo(() => HERO_TAGLINES[Math.floor(Math.random() * HERO_TAGLINES.length)], []);

  const toggleModelSelection = (modelId: string) => {
    setSelectedModels((prev) => {
      if (prev.includes(modelId)) {
        const next = prev.filter((id) => id !== modelId);
        return next;
      }
      return [...prev, modelId];
    });
  };

  const handleStartGeneration = () => {
    if (!config.apiKey) {
      setGenerationError('Enter your OpenRouter API key first.');
      return;
    }
    if (!selectedModels.length) {
      setGenerationError('Select at least one model to start generating.');
      return;
    }
    setGenerationError(null);
    selectedModels.forEach((modelId) => startRunForModel(modelId));
  };

  const startRunForModel = (modelId: string) => {
    if (!config.apiKey) {
      setGenerationError('Enter your OpenRouter API key first.');
      return;
    }
    const controller = new AbortController();
    controllersRef.current[modelId]?.abort();
    controllersRef.current[modelId] = controller;

    setRuns((prev) => ({
      ...prev,
      [modelId]: {
        modelId,
        streamedText: '',
        status: 'running',
        result: undefined,
        previewSvg: undefined,
        error: undefined,
        statusMessage: '',
        isPublishing: false,
        isExportingPng: false,
        isExportingGif: false,
        durationMs: undefined,
        animationSpeed: prev[modelId]?.animationSpeed ?? 40,
        title: prev[modelId]?.title ?? defaultTitleForModel(modelId),
        startedAt: Date.now(),
      },
    }));

    void generatePixelArt(
      {
        apiKey: config.apiKey,
        prompt,
        gridSize,
        paletteLimit,
        model: modelId,
      },
      {
        signal: controller.signal,
        onToken: (chunk) => {
          setRuns((prev) => {
            const current = prev[modelId];
            if (!current) return prev;
            return {
              ...prev,
              [modelId]: {
                ...current,
                streamedText: `${current.streamedText}${chunk}`,
              },
            };
          });
        },
      },
    )
      .then((result) => {
        const svg = buildSvg(result.grid);
        const finishedAt = Date.now();
        setRuns((prev) => {
          const current = prev[modelId];
          if (!current) return prev;
          return {
            ...prev,
            [modelId]: {
              ...current,
              status: 'completed',
              result,
              previewSvg: svg,
              title: result.title ?? current.title,
              error: undefined,
              statusMessage: 'Generation finished ✅',
              durationMs: finishedAt - current.startedAt,
            },
          };
        });
      })
      .catch((error) => {
        console.error(error);
        const isAbort = error instanceof DOMException && error.name === 'AbortError';
        setRuns((prev) => {
          const current = prev[modelId];
          if (!current) return prev;
          return {
            ...prev,
            [modelId]: {
              ...current,
              status: isAbort ? 'cancelled' : 'error',
              error: isAbort ? 'Stream aborted for this model' : error instanceof Error ? error.message : 'Generation failed',
              statusMessage: isAbort ? 'Generation aborted' : '',
            },
          };
        });
      })
      .finally(() => {
        delete controllersRef.current[modelId];
      });
  };

  const handleCancelRun = (modelId: string) => {
    controllersRef.current[modelId]?.abort();
  };

  const handleTitleChange = (modelId: string, value: string) => {
    setRuns((prev) => {
      const current = prev[modelId];
      if (!current) return prev;
      return {
        ...prev,
        [modelId]: {
          ...current,
          title: value,
        },
      };
    });
  };

  const handlePublish = async (modelId: string) => {
    const run = runs[modelId];
    if (!run?.result) return;
    if (!config.authorHandle) {
      setRuns((prev) => {
        const current = prev[modelId];
        if (!current) return prev;
        return {
          ...prev,
          [modelId]: {
            ...current,
            statusMessage: 'Add a display handle before publishing.',
          },
        };
      });
      return;
    }

    setRuns((prev) => {
      const current = prev[modelId];
      if (!current) return prev;
      return {
        ...prev,
        [modelId]: {
          ...current,
          isPublishing: true,
          statusMessage: 'Publishing...'
        },
      };
    });

    try {
      await createArtwork({
        title: run.title,
        prompt,
        model: modelId,
        authorHandle: config.authorHandle,
        grid: run.result.grid,
        previewSvg: run.previewSvg ?? buildSvg(run.result.grid),
        palette: run.result.palette,
        steps: run.result.steps,
        durationMs: run.durationMs ?? 0,
      });
      setRuns((prev) => {
        const current = prev[modelId];
        if (!current) return prev;
        return {
          ...prev,
          [modelId]: {
            ...current,
            isPublishing: false,
            statusMessage: 'Published to the community ✨',
          },
        };
      });
      setToastMessage('Sprite published to the community!');
    } catch (error) {
      console.error(error);
      setRuns((prev) => {
        const current = prev[modelId];
        if (!current) return prev;
        return {
          ...prev,
          [modelId]: {
            ...current,
            isPublishing: false,
            statusMessage: error instanceof Error ? error.message : 'Failed to publish',
          },
        };
      });
    }
  };

  const filenameForRun = (run: ModelRunState) => {
    const base = run.title?.trim() || 'sprite';
    return base;
  };

  const handleDownloadPng = async (modelId: string) => {
    const run = runs[modelId];
    if (!run?.result) return;
    setRuns((prev) => {
      const current = prev[modelId];
      if (!current) return prev;
      return {
        ...prev,
        [modelId]: {
          ...current,
          isExportingPng: true,
          statusMessage: 'Exporting PNG...'
        },
      };
    });
    try {
      await downloadSpritePng(filenameForRun(run), run.result.grid);
      setRuns((prev) => {
        const current = prev[modelId];
        if (!current) return prev;
        return {
          ...prev,
          [modelId]: {
            ...current,
            isExportingPng: false,
            statusMessage: 'PNG downloaded',
          },
        };
      });
    } catch (error) {
      console.error(error);
      setRuns((prev) => {
        const current = prev[modelId];
        if (!current) return prev;
        return {
          ...prev,
          [modelId]: {
            ...current,
            isExportingPng: false,
            statusMessage: error instanceof Error ? error.message : 'PNG export failed',
          },
        };
      });
    }
  };

  const handleDownloadGif = async (modelId: string) => {
    const run = runs[modelId];
    if (!run?.result || !run.result.steps.length) return;
    setRuns((prev) => {
      const current = prev[modelId];
      if (!current) return prev;
      return {
        ...prev,
        [modelId]: {
          ...current,
          isExportingGif: true,
          statusMessage: 'Exporting GIF...'
        },
      };
    });
    try {
      await downloadSpriteGif({
        filename: filenameForRun(run),
        size: run.result.grid.size,
        palette: run.result.palette,
        steps: run.result.steps,
        delayMs: run.animationSpeed,
      });
      setRuns((prev) => {
        const current = prev[modelId];
        if (!current) return prev;
        return {
          ...prev,
          [modelId]: {
            ...current,
            isExportingGif: false,
            statusMessage: 'GIF downloaded',
          },
        };
      });
    } catch (error) {
      console.error(error);
      setRuns((prev) => {
        const current = prev[modelId];
        if (!current) return prev;
        return {
          ...prev,
          [modelId]: {
            ...current,
            isExportingGif: false,
            statusMessage: error instanceof Error ? error.message : 'GIF export failed',
          },
        };
      });
    }
  };

  const handleAnimationSpeedChange = (modelId: string, value: number) => {
    setRuns((prev) => {
      const current = prev[modelId];
      if (!current) return prev;
      return {
        ...prev,
        [modelId]: {
          ...current,
          animationSpeed: value,
        },
      };
    });
  };

  const handleClearSelection = () => {
    setSelectedModels([]);
  };

  const handleSelectFiltered = () => {
    setSelectedModels(filteredModels.map((item) => item.id));
  };

  return (
    <>
    <main className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-10">
      <section className="rounded-3xl border border-white/10 bg-gradient-to-br from-brand-500/40 via-brand-500/10 to-transparent p-8 shadow-glow">
        <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/40 px-4 py-1 text-xs uppercase tracking-[0.3em] text-white/80">
          <span>Multi-model Pixel Lab</span>
        </p>
        <h1 className="text-4xl font-semibold leading-tight md:text-5xl">Select multiple models and generate sprites in parallel</h1>
        <p className="mt-4 text-lg text-white/80">{heroText}</p>
        <div className="mt-6 flex flex-wrap gap-4 text-sm text-white/70">
          <div className="rounded-full border border-white/20 px-4 py-2">Streaming JSON parsing</div>
          <div className="rounded-full border border-white/20 px-4 py-2">Palette-indexed output</div>
          <div className="rounded-full border border-white/20 px-4 py-2">Instant model comparisons</div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 lg:col-span-2">
          <div className="flex flex-col gap-4">
            <div>
          <p className="text-xs uppercase tracking-[0.3em] text-white/50">1. Configure OpenRouter</p>
              <input
                type="password"
                value={config.apiKey}
                onChange={(e) => setConfig((prev) => ({ ...prev, apiKey: e.target.value }))}
                placeholder="sk-or-v1-..."
                className="mt-2 w-full rounded-xl border border-white/20 bg-black/20 px-4 py-3 text-sm outline-none focus:border-brand-400"
              />
            </div>
            <div>
          <p className="text-xs uppercase tracking-[0.3em] text-white/50">2. Display handle</p>
              <input
                value={config.authorHandle}
                onChange={(e) => setConfig((prev) => ({ ...prev, authorHandle: e.target.value }))}
                placeholder="e.g. pixel-architect"
                className="mt-2 w-full rounded-xl border border-white/20 bg-black/20 px-4 py-3 text-sm outline-none focus:border-brand-400"
              />
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <p className="text-xs uppercase tracking-[0.3em] text-white/50">Quick tips</p>
          <ul className="mt-3 space-y-2 text-sm text-white/70">
            <li>• Keys stay in local storage; nothing hits the server.</li>
            <li>• Default grid is 16×16 but you can scale up to 64×64.</li>
            <li>• Palettes must be referenced by index for every pixel.</li>
          </ul>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 lg:col-span-2">
          <p className="text-xs uppercase tracking-[0.3em] text-white/50">Prompt</p>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="mt-3 min-h-[160px] w-full rounded-2xl border border-white/20 bg-black/30 px-4 py-3 text-sm outline-none focus:border-brand-400"
          />
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="text-sm">
              <span className="text-white/60">Pixel resolution</span>
              <input
                type="range"
                min={12}
                max={64}
                value={gridSize}
                onChange={(e) => setGridSize(parseInt(e.target.value, 10))}
                className="mt-2 w-full"
              />
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-white/50">
                <span>{gridSize} × {gridSize}</span>
                <div className="flex flex-wrap gap-1">
                  {[8, 16, 32, 64].map((size) => (
                    <button
                      key={size}
                      type="button"
                      className={`rounded-full border px-2 py-0.5 ${gridSize === size ? 'border-brand-400 text-white' : 'border-white/20 text-white/60 hover:border-white/60'}`}
                      onClick={() => setGridSize(size)}
                    >
                      {size}²
                    </button>
                  ))}
                </div>
              </div>
            </label>
            <label className="text-sm">
              <span className="text-white/60">Palette limit</span>
              <input
                type="number"
                min={4}
                max={12}
                value={paletteLimit}
                onChange={(e) => setPaletteLimit(parseInt(e.target.value, 10))}
                className="mt-2 w-full rounded-xl border border-white/20 bg-black/30 px-3 py-2 text-sm"
              />
            </label>
          </div>
        </div>
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <p className="text-xs uppercase tracking-[0.3em] text-white/50">Choose models</p>
          <div className="mt-3 flex flex-col gap-3">
            <input
              value={modelQuery}
              onChange={(e) => setModelQuery(e.target.value)}
              placeholder="Search models (name or ID)"
              className="w-full rounded-xl border border-white/20 bg-black/30 px-3 py-2 text-sm"
            />
            <div className="flex flex-wrap gap-2 text-xs text-white/60">
              <button
                type="button"
                onClick={handleSelectFiltered}
                className="rounded-full border border-white/20 px-3 py-1 hover:border-brand-400"
              >
                Select all
              </button>
              <button
                type="button"
                onClick={handleClearSelection}
                className="rounded-full border border-white/20 px-3 py-1 hover:border-brand-400"
              >
                Clear selection
              </button>
              <button
                type="button"
                onClick={() => void loadModels()}
                disabled={isLoadingModels}
                className="rounded-full border border-white/20 px-3 py-1 hover:border-brand-400 disabled:cursor-not-allowed"
              >
                {isLoadingModels ? 'Syncing...' : 'Refresh'}
              </button>
            </div>
          </div>
          <p className="mt-2 text-xs text-white/50">
            {filteredModels.length
              ? `Showing ${filteredModels.length} / ${models.length} models`
              : 'No models match this query – try clearing search'}
          </p>
          {modelError && <p className="mt-1 text-xs text-amber-300">{modelError}</p>}
          <div className="mt-4 max-h-80 space-y-2 overflow-y-auto pr-2">
            {filteredModels.length ? (
              filteredModels.map((option) => {
                const checked = selectedModels.includes(option.id);
                return (
                  <label
                    key={option.id}
                    className={`flex cursor-pointer items-start gap-3 rounded-2xl border px-3 py-2 text-sm transition ${
                      checked ? 'border-brand-400 bg-brand-500/10' : 'border-white/10 hover:border-white/40'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleModelSelection(option.id)}
                      className="mt-1"
                    />
                    <div>
                      <p className="font-semibold">{getModelLabel(option)}</p>
                      <p className="text-xs text-white/60">{option.id}</p>
                    </div>
                  </label>
                );
              })
            ) : (
              <div className="rounded-xl border border-dashed border-white/20 p-4 text-center text-sm text-white/60">
                No models available
              </div>
            )}
          </div>
          {selectedModels.length > 0 && (
            <div className="mt-4 text-xs text-white/60">
              Selected {selectedModels.length} models:
              <div className="mt-2 flex flex-wrap gap-2">
                {selectedModels.map((id) => {
                  const model = models.find((m) => m.id === id);
                  return (
                    <span key={id} className="rounded-full border border-white/20 px-3 py-1 text-xs">
                      {model ? getModelLabel(model) : id}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-semibold">Batch generate</h2>
            <p className="text-sm text-white/60">
              {selectedModels.length
                ? `Running ${selectedModels.length} model(s) in parallel.`
                : 'No models selected yet—pick some on the right.'}
              {activeRunCount ? ` ${activeRunCount} model(s) currently generating.` : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={handleStartGeneration}
            className="rounded-2xl bg-brand-500 px-6 py-3 text-base font-semibold text-white shadow-glow transition hover:bg-brand-400"
          >
            Start generating
          </button>
        </div>
        {generationError && <p className="mt-4 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-200">{generationError}</p>}
      </section>

      <section className="space-y-6">
        <h2 className="text-2xl font-semibold">Compare model outputs</h2>
        {orderedRuns.length ? (
          orderedRuns.map((run) => {
            const status = STATUS_STYLE[run.status];
            const gridSize = run.result?.grid.size ?? 0;
            const previewPixelSize = gridSize ? Math.max(4, Math.floor(384 / gridSize)) : 12;
            const playerPixelSize = gridSize ? Math.max(3, Math.floor(320 / gridSize)) : 8;
            return (
              <div key={run.modelId} className="rounded-3xl border border-white/10 bg-white/5 p-6">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-white/50">{run.modelId}</p>
                    <h3 className="text-xl font-semibold">{models.find((m) => m.id === run.modelId)?.name ?? run.modelId}</h3>
                  </div>
                  <div className={`inline-flex items-center rounded-full px-4 py-1 text-sm font-semibold ${status.className}`}>
                    {status.label}
                  </div>
                </div>
                <div className={`mt-6 grid gap-6 ${run.result ? 'lg:grid-cols-2' : ''}`}>
                  {run.result && (
                    <div className="space-y-4">
                      <div>
                        <p className="text-xs uppercase tracking-[0.3em] text-white/50">Sprite title</p>
                        <input
                          value={run.title}
                          onChange={(e) => handleTitleChange(run.modelId, e.target.value)}
                          className="mt-2 w-full rounded-xl border border-white/20 bg-transparent px-3 py-2 text-lg font-semibold"
                        />
                      </div>
                      <PixelPreview grid={run.result.grid} pixelSize={previewPixelSize} />
                      <div className="text-sm text-white/70">
                        <p className="font-semibold">Palette</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {run.result.palette.map((color) => (
                            <span key={color} className="flex items-center gap-2 rounded-full border border-white/10 px-3 py-1 text-xs">
                              <span className="h-4 w-4 rounded-full" style={{ backgroundColor: color }} />
                              {color}
                            </span>
                          ))}
                        </div>
                      </div>
                      {run.result.steps.length > 0 && (
                        <PixelStepPlayer
                          size={run.result.grid.size}
                          palette={run.result.palette}
                          steps={run.result.steps}
                          pixelSize={playerPixelSize}
                          speed={run.animationSpeed}
                          onSpeedChange={(value) => handleAnimationSpeedChange(run.modelId, value)}
                        />
                      )}
                      <div className="flex flex-wrap gap-2 text-sm">
                        <button
                          type="button"
                          onClick={() => handleDownloadPng(run.modelId)}
                          disabled={run.isExportingPng}
                          className="rounded-full border border-white/20 px-4 py-2 text-white/80 transition hover:border-brand-400 disabled:cursor-not-allowed disabled:text-white/40"
                        >
                          {run.isExportingPng ? 'Exporting PNG...' : 'Download PNG'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDownloadGif(run.modelId)}
                          disabled={run.isExportingGif || !run.result.steps.length}
                          className="rounded-full border border-white/20 px-4 py-2 text-white/80 transition hover:border-brand-400 disabled:cursor-not-allowed disabled:text-white/40"
                        >
                          {run.isExportingGif ? 'Exporting GIF...' : 'Download GIF'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handlePublish(run.modelId)}
                          disabled={!config.authorHandle || run.isPublishing}
                          className="rounded-full border border-brand-400 px-4 py-2 text-white transition hover:bg-brand-500 disabled:cursor-not-allowed disabled:border-white/20 disabled:text-white/40"
                        >
                          {run.isPublishing ? 'Publishing...' : config.authorHandle ? 'Publish to community' : 'Add a handle to publish'}
                        </button>
                      </div>
                      {run.result.steps.length > 0 && (
                        <div className="text-sm text-white/70">
                          <p className="font-semibold">Painting steps</p>
                          <ol className="mt-3 space-y-2">
                            {run.result.steps.map((step, index) => (
                              <li key={`${run.modelId}-step-${index}`} className="rounded-xl border border-white/10 bg-black/20 p-3">
                                <p className="text-white">
                                  Step {index + 1}: {step.description}
                                </p>
                                <p className="text-xs text-white/60">Changed {step.pixels.length} pixel(s) in this step</p>
                                {step.tool && (
                                  <p className="text-xs text-white/50">
                                    Tool:
                                    {step.tool.kind === 'fillRect' &&
                                      ` Rect (${step.tool.x},${step.tool.y}) ${step.tool.width}×${step.tool.height}`}
                                    {step.tool.kind === 'fillCircle' &&
                                      ` Circle center (${step.tool.cx},${step.tool.cy}) r=${step.tool.radius}`}
                                    {step.tool.kind === 'line' &&
                                      ` Line (${step.tool.x1},${step.tool.y1})→(${step.tool.x2},${step.tool.y2})`}
                                    , ci={step.tool.ci}
                                  </p>
                                )}
                              </li>
                            ))}
                          </ol>
                        </div>
                      )}
                    </div>
                  )}
                  <div className="flex flex-col gap-3">
                    <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
                    <p className="text-xs uppercase tracking-[0.3em] text-white/50">Streaming output</p>
                      <div className="mt-3 max-h-60 overflow-y-auto font-mono text-sm text-white/80">
                        {run.streamedText ? run.streamedText : 'Waiting for the model to stream...'}
                      </div>
                    </div>
                    {run.status === 'running' && (
                      <button
                        type="button"
                        onClick={() => handleCancelRun(run.modelId)}
                        className="rounded-2xl border border-white/20 py-2 text-sm text-white/80 transition hover:border-red-400 hover:text-red-200"
                      >
                        Stop this model
                      </button>
                    )}
                    {run.error && <p className="text-sm text-red-300">{run.error}</p>}
                    {run.statusMessage && !run.error && <p className="text-sm text-white/70">{run.statusMessage}</p>}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="rounded-3xl border border-dashed border-white/10 p-8 text-center text-white/60">
            Pick some models and hit “Start generating” to see their logs and sprites here.
          </div>
        )}
      </section>
    </main>
    {toastMessage && (
      <div className="fixed bottom-6 right-6 rounded-2xl border border-white/20 bg-black/80 px-4 py-3 text-sm text-white shadow-glow">
        {toastMessage}
      </div>
    )}
    </>
  );
}
