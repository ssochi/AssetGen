import { GIFEncoder, applyPalette, quantize } from 'gifenc';
import { buildTimelineEvents } from './steps';
import { PixelArtStep, PixelColorGrid } from './types';
import { gridToMatrix } from './pixel';

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

function sanitizeFilename(name: string, ext: string) {
  const slug = name.replace(/[^a-zA-Z0-9-_]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'sprite';
  return `${slug}.${ext}`;
}

function drawMatrix(ctx: CanvasRenderingContext2D, matrix: string[][], pixelSize: number) {
  matrix.forEach((row, y) => {
    row.forEach((color, x) => {
      ctx.fillStyle = color;
      ctx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
    });
  });
}

export async function downloadSpritePng(filename: string, grid: PixelColorGrid, pixelSize = 16) {
  const canvas = document.createElement('canvas');
  canvas.width = grid.size * pixelSize;
  canvas.height = grid.size * pixelSize;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context unavailable');
  const matrix = gridToMatrix(grid);
  drawMatrix(ctx, matrix, pixelSize);
  const blob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob((result) => {
      if (result) resolve(result);
      else reject(new Error('Failed to generate PNG'));
    });
  });
  triggerDownload(blob, sanitizeFilename(filename, 'png'));
}

export async function downloadSpriteGif(options: {
  filename: string;
  size: number;
  palette: string[];
  steps: PixelArtStep[];
  pixelSize?: number;
  delayMs?: number;
}) {
  const { filename, size, palette, steps, pixelSize = Math.max(8, Math.floor(256 / size)), delayMs = 40 } = options;
  const FINAL_PAUSE_MS = 3000;
  if (!steps.length) {
    throw new Error('No painting steps, cannot generate GIF');
  }
  const canvas = document.createElement('canvas');
  canvas.width = size * pixelSize;
  canvas.height = size * pixelSize;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context unavailable');

  const fallbackColor = palette[0] ?? '#000000';
  const matrix = Array.from({ length: size }, () => Array(size).fill(fallbackColor));

  const gif = GIFEncoder();
  const events = buildTimelineEvents(steps);

  const colorFromPalette = (ci: number) => {
    if (palette.length === 0) return fallbackColor;
    const safeIndex = ((ci % palette.length) + palette.length) % palette.length;
    return palette[safeIndex] ?? fallbackColor;
  };

  const framesAdded = events.length;
  if (!framesAdded) {
    throw new Error('No animatable pixels found in the steps');
  }

  const writeFrame = (delay: number) => {
    drawMatrix(ctx, matrix, pixelSize);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const rgba = new Uint8Array(imageData.data);
    const paletteData = quantize(rgba, 256);
    const index = applyPalette(rgba, paletteData);
    gif.writeFrame(index, canvas.width, canvas.height, { palette: paletteData, delay });
  };

  events.forEach((event) => {
    event.strokes.forEach((stroke) => {
      if (stroke.x < 0 || stroke.x >= size || stroke.y < 0 || stroke.y >= size) return;
      matrix[stroke.y][stroke.x] = colorFromPalette(stroke.ci ?? 0);
    });
    writeFrame(delayMs);
  });

  writeFrame(FINAL_PAUSE_MS);

  gif.finish();
  const buffer = gif.bytes();
  const blob = new Blob([buffer], { type: 'image/gif' });
  triggerDownload(blob, sanitizeFilename(filename, 'gif'));
}
