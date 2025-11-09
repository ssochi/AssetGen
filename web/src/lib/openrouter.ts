import { flattenMatrix, gridToSvg, normalizeColor } from './pixel';
import {
  GenerationRequest,
  GeneratedPixelArt,
  ModelSummary,
  PixelArtStep,
  PixelColorGrid,
  PixelStroke,
  PixelTool,
} from './types';

export const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODELS_URL = 'https://openrouter.ai/api/v1/models';
export const APP_TITLE = 'AssetGen Pixel Foundry';
export const REFERER = process.env.NEXT_PUBLIC_APP_ORIGIN ?? 'http://localhost:3000';

const pixelSchema = {
  name: 'pixel_art_blueprint_steps',
  schema: {
    type: 'object',
    properties: {
      title: { type: 'string', description: 'Short name for the sprite' },
      description: { type: 'string', description: 'One sentence lore' },
      palette: {
        type: 'array',
        items: { type: 'string' },
        minItems: 1,
        maxItems: 12,
        description: 'Palette array where index 0..n-1 map to HEX colors',
      },
      size: {
        type: 'integer',
        minimum: 8,
        maximum: 64,
        description: 'Square grid size',
      },
      steps: {
        type: 'array',
        description:
          'Painting steps in chronological order. Each step describes pixels (x,y) painted using palette indexes or leverages a pixel-art tool (fillRect, fillCircle, line).',
        items: {
          type: 'object',
          properties: {
            description: { type: 'string', description: 'Human readable narration of this stroke' },
            pixels: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  x: { type: 'integer', minimum: 0 },
                  y: { type: 'integer', minimum: 0 },
                  ci: { type: 'integer', minimum: 0, description: 'Palette index (short for colorIndex)' },
                },
                required: ['x', 'y', 'ci'],
                additionalProperties: false,
              },
            },
            tool: {
              type: 'object',
              description: 'Optional helper tool. Supported kinds: fillRect, fillCircle, line',
              properties: {
                kind: { type: 'string', enum: ['fillRect', 'fillCircle', 'line'] },
                ci: { type: 'integer', minimum: 0 },
                x: { type: 'integer' },
                y: { type: 'integer' },
                width: { type: 'integer' },
                height: { type: 'integer' },
                cx: { type: 'integer' },
                cy: { type: 'integer' },
                radius: { type: 'integer' },
                x1: { type: 'integer' },
                y1: { type: 'integer' },
                x2: { type: 'integer' },
                y2: { type: 'integer' },
              },
              required: ['kind', 'ci'],
              additionalProperties: true,
            },
          },
          required: ['description'],
          additionalProperties: false,
        },
        minItems: 1,
      },
    },
    required: ['size', 'steps', 'palette'],
    additionalProperties: false,
  },
};

function normalizePalette(payload: any): string[] {
  const paletteRaw: string[] = Array.isArray(payload?.palette) ? payload.palette : [];
  const palette = paletteRaw
    .map((color) => normalizeColor(String(color)))
    .filter((color, index, self) => color && self.indexOf(color) === index);

  if (!palette.length) {
    palette.push('#000000');
  }

  return palette;
}

function clampSize(value: number, fallbackSize: number) {
  if (!Number.isInteger(value)) return Math.min(Math.max(fallbackSize, 8), 64);
  return Math.min(Math.max(value, 8), 64);
}

function safeStroke(raw: any): PixelStroke | null {
  const x = Number(raw?.x);
  const y = Number(raw?.y);
  const colorIndex = Number(raw?.ci ?? raw?.colorIndex ?? raw?.paletteIndex);
  if (!Number.isInteger(x) || !Number.isInteger(y) || !Number.isInteger(colorIndex)) {
    return null;
  }
  return { x, y, ci: colorIndex };
}

function parseTool(raw: any): PixelTool | null {
  if (!raw || typeof raw !== 'object') return null;
  const kind = typeof raw.kind === 'string' ? raw.kind : typeof raw.type === 'string' ? raw.type : null;
  const ci = Number(raw.ci ?? raw.colorIndex ?? raw.paletteIndex);
  if (!kind || !Number.isInteger(ci)) return null;
  switch (kind) {
    case 'fillRect': {
      const x = Number(raw.x);
      const y = Number(raw.y);
      const width = Number(raw.width);
      const height = Number(raw.height);
      if ([x, y, width, height].every((value) => Number.isInteger(value)) && width > 0 && height > 0) {
        return { kind: 'fillRect', x, y, width, height, ci };
      }
      break;
    }
    case 'fillCircle': {
      const cx = Number(raw.cx ?? raw.x);
      const cy = Number(raw.cy ?? raw.y);
      const radius = Number(raw.radius);
      if ([cx, cy, radius].every((value) => Number.isInteger(value)) && radius > 0) {
        return { kind: 'fillCircle', cx, cy, radius, ci };
      }
      break;
    }
    case 'line': {
      const x1 = Number(raw.x1 ?? raw.x);
      const y1 = Number(raw.y1 ?? raw.y);
      const x2 = Number(raw.x2);
      const y2 = Number(raw.y2);
      if ([x1, y1, x2, y2].every((value) => Number.isInteger(value))) {
        return { kind: 'line', x1, y1, x2, y2, ci };
      }
      break;
    }
    default:
      break;
  }
  return null;
}

function clampCoordinate(value: number, size: number) {
  if (value < 0) return 0;
  if (value >= size) return size - 1;
  return value;
}

function strokesFromTool(tool: PixelTool, size: number): PixelStroke[] {
  const strokes: PixelStroke[] = [];
  if (tool.kind === 'fillRect') {
    const startX = clampCoordinate(tool.x, size);
    const startY = clampCoordinate(tool.y, size);
    const endX = clampCoordinate(tool.x + tool.width - 1, size);
    const endY = clampCoordinate(tool.y + tool.height - 1, size);
    for (let y = startY; y <= endY; y += 1) {
      for (let x = startX; x <= endX; x += 1) {
        strokes.push({ x, y, ci: tool.ci });
      }
    }
  } else if (tool.kind === 'fillCircle') {
    const cx = clampCoordinate(tool.cx, size);
    const cy = clampCoordinate(tool.cy, size);
    const radius = Math.max(1, tool.radius);
    const radiusSq = radius * radius;
    const minX = clampCoordinate(cx - radius, size);
    const maxX = clampCoordinate(cx + radius, size);
    const minY = clampCoordinate(cy - radius, size);
    const maxY = clampCoordinate(cy + radius, size);
    for (let y = minY; y <= maxY; y += 1) {
      for (let x = minX; x <= maxX; x += 1) {
        const dx = x - cx;
        const dy = y - cy;
        if (dx * dx + dy * dy <= radiusSq) {
          strokes.push({ x, y, ci: tool.ci });
        }
      }
    }
  } else if (tool.kind === 'line') {
    let x0 = clampCoordinate(tool.x1, size);
    let y0 = clampCoordinate(tool.y1, size);
    const x1 = clampCoordinate(tool.x2, size);
    const y1 = clampCoordinate(tool.y2, size);
    const dx = Math.abs(x1 - x0);
    const sx = x0 < x1 ? 1 : -1;
    const dy = -Math.abs(y1 - y0);
    const sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    while (true) {
      strokes.push({ x: x0, y: y0, ci: tool.ci });
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) {
        err += dy;
        x0 += sx;
      }
      if (e2 <= dx) {
        err += dx;
        y0 += sy;
      }
      if (x0 < 0 || x0 >= size || y0 < 0 || y0 >= size) break;
    }
  }
  return strokes;
}

function coerceFromSteps(payload: any, fallbackSize: number): {
  grid: PixelColorGrid;
  palette: string[];
  steps: PixelArtStep[];
} {
  const palette = normalizePalette(payload);
  const normalizedSize = clampSize(payload?.size, fallbackSize);
  const baseColor = palette[0];
  const matrix: string[][] = Array.from({ length: normalizedSize }, () => Array(normalizedSize).fill(baseColor));

  const stepsRaw: any[] = Array.isArray(payload?.steps) ? payload.steps : [];
  const steps: PixelArtStep[] = [];

  stepsRaw.forEach((stepRaw: any, index) => {
    const description = typeof stepRaw?.description === 'string' && stepRaw.description.trim()
      ? stepRaw.description.trim()
      : `Step ${index + 1}`;
    const pixelsRaw = Array.isArray(stepRaw?.pixels) ? stepRaw.pixels : [];
    const pixels: PixelStroke[] = [];
    const tool = parseTool(stepRaw?.tool);
    pixelsRaw.forEach((pixelRaw: any) => {
      const stroke = safeStroke(pixelRaw);
      if (!stroke) return;
      if (stroke.x < 0 || stroke.x >= normalizedSize || stroke.y < 0 || stroke.y >= normalizedSize) return;
      const safeIndex = stroke.ci >= 0 ? stroke.ci : 0;
      const color = palette[safeIndex] ?? palette[safeIndex % palette.length] ?? baseColor;
      matrix[stroke.y][stroke.x] = color;
      pixels.push({ x: stroke.x, y: stroke.y, ci: safeIndex });
    });
    if (tool) {
      const toolPixels = strokesFromTool(tool, normalizedSize);
      toolPixels.forEach((stroke) => {
        if (stroke.x < 0 || stroke.x >= normalizedSize || stroke.y < 0 || stroke.y >= normalizedSize) return;
        const safeIndex = stroke.ci >= 0 ? stroke.ci : 0;
        const color = palette[safeIndex] ?? palette[safeIndex % palette.length] ?? baseColor;
        matrix[stroke.y][stroke.x] = color;
        pixels.push({ x: stroke.x, y: stroke.y, ci: safeIndex });
      });
    }
    steps.push({ description, pixels, tool: tool ?? undefined });
  });

  return { grid: flattenMatrix(matrix), palette, steps };
}

interface StreamOptions {
  onToken?: (chunk: string) => void;
  signal?: AbortSignal;
}

export async function generatePixelArt(
  req: GenerationRequest,
  options: StreamOptions = {},
): Promise<GeneratedPixelArt> {
  const body = {
    model: req.model,
    response_format: { type: 'json_schema', json_schema: pixelSchema },
    stream: true,
    messages: [
      {
        role: 'system',
        content:
          'You are a pixel artist who outputs perfect JSON for sprites. Return a palette array of HEX strings (<=8 colors) and describe the painting as ordered steps. Each step must include a description plus either a list of pixels (x, y, ci) or a tool (fillRect, fillCircle, line) that references the palette via ci. The fillCircle tool should conceptually set every integer pixel whose (x - cx)^2 + (y - cy)^2 <= radius^2, so acknowledge that very small radii may look imperfect on low-resolution grids. Keep the sprite readable on dark backgrounds.',
      },
      {
        role: 'user',
        content: `Create a ${req.gridSize}x${req.gridSize} sprite. Prompt: ${req.prompt}. Palette must have <= ${req.paletteLimit ?? 8} HEX colors. Output ordered painting steps and for each step include a description plus either explicit pixels (with x, y, ci) or one tool object using: fillRect{x,y,width,height,ci}, fillCircle{cx,cy,radius,ci}, line{x1,y1,x2,y2,ci}. When using fillCircle, remember it fills every integer pixel satisfying (x-cx)^2 + (y-cy)^2 <= radius^2, so mention if the circle might look blocky at small sizes. Always reference colors by the palette index in field "ci".`,
      },
    ],
  };

  const res = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${req.apiKey}`,
      'HTTP-Referer': REFERER,
      'X-Title': APP_TITLE,
    },
    body: JSON.stringify(body),
    signal: options.signal,
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.error ?? 'OpenRouter request failed');
  }

  if (!res.body) {
    throw new Error('Streaming response body missing');
  }

  const decoder = new TextDecoder();
  const reader = res.body.getReader();
  let buffer = '';
  let assembled = '';

  const emitChunk = (chunk?: string, { includeInJson = true }: { includeInJson?: boolean } = {}) => {
    if (!chunk) return;
    if (includeInJson) {
      assembled += chunk;
    }
    options.onToken?.(chunk);
  };

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split('\n\n');
    buffer = parts.pop() ?? '';
    for (const part of parts) {
      const trimmed = part.trim();
      if (!trimmed.startsWith('data:')) continue;
      const payload = trimmed.slice(5).trim();
      if (!payload || payload === '[DONE]') {
        continue;
      }
      try {
        const json = JSON.parse(payload);
        const delta = json?.choices?.[0]?.delta;
        if (!delta) {
          continue;
        }
        const deltaContent = delta.content;
        if (typeof deltaContent === 'string') {
          emitChunk(deltaContent);
        } else if (Array.isArray(deltaContent)) {
          deltaContent.forEach((piece) => {
            const text = typeof piece?.text === 'string' ? piece.text : '';
            if (!text) return;
            const includeInJson = piece?.type ? piece.type === 'output_text' : true;
            emitChunk(text, { includeInJson });
          });
        }

        const reasoning = delta?.reasoning;
        if (reasoning) {
          if (typeof reasoning === 'string') {
            emitChunk(reasoning, { includeInJson: false });
          } else if (typeof reasoning === 'object') {
            if (typeof reasoning.text === 'string') {
              emitChunk(reasoning.text, { includeInJson: false });
            }
            if (Array.isArray(reasoning.content)) {
              reasoning.content.forEach((piece: any) => {
                const text = typeof piece?.text === 'string' ? piece.text : '';
                if (!text) return;
                emitChunk(text, { includeInJson: false });
              });
            }
          }
        }

        const choiceReasoning = json?.choices?.[0]?.reasoning;
        if (choiceReasoning) {
          if (typeof choiceReasoning === 'string') {
            emitChunk(choiceReasoning, { includeInJson: false });
          } else if (typeof choiceReasoning === 'object') {
            if (typeof choiceReasoning.text === 'string') {
              emitChunk(choiceReasoning.text, { includeInJson: false });
            }
            if (Array.isArray(choiceReasoning.content)) {
              choiceReasoning.content.forEach((piece: any) => {
                const text = typeof piece?.text === 'string' ? piece.text : '';
                if (!text) return;
                emitChunk(text, { includeInJson: false });
              });
            }
          }
        }
      } catch (error) {
        console.error('Failed to parse stream chunk', error);
      }
    }
  }

  if (!assembled.trim()) {
    throw new Error('Model did not stream any output');
  }

  const firstBrace = assembled.indexOf('{');
  const lastBrace = assembled.lastIndexOf('}');
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    throw new Error('Model output lacked a JSON object');
  }
  const jsonSlice = assembled.slice(firstBrace, lastBrace + 1);

  let parsed: any = {};
  try {
    parsed = JSON.parse(jsonSlice);
  } catch (error) {
    throw new Error('Model did not return valid JSON');
  }

  const { grid, palette, steps } = coerceFromSteps(parsed, req.gridSize);

  return {
    title: parsed.title ?? 'Untitled Sprite',
    description: parsed.description ?? 'AI generated pixel art',
    grid,
    palette,
    steps,
  };
}

export function buildSvg(grid: PixelColorGrid): string {
  return gridToSvg(grid, Math.max(8, Math.floor(192 / grid.size)));
}

export async function fetchOpenRouterModels(apiKey?: string): Promise<ModelSummary[]> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'HTTP-Referer': REFERER,
    'X-Title': APP_TITLE,
  };
  if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`;
  }

  const res = await fetch(MODELS_URL, {
    method: 'GET',
    headers,
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.error ?? 'Failed to fetch OpenRouter models');
  }

  const payload = (await res.json()) as { data?: Array<Record<string, any>> };
  const models = (payload.data ?? [])
    .map<ModelSummary>((entry) => ({
      id: entry.id,
      name: entry.name ?? entry.id,
      description: entry.description ?? entry.id,
      contextLength: entry.context_length,
      pricing: entry.pricing,
    }))
    .filter((entry) => Boolean(entry.id) && Boolean(entry.name));

  return models;
}
