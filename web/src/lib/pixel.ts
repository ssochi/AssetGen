import { PixelColorGrid } from './types';

export function normalizeColor(color: string): string {
  const value = color.trim();
  if (value.startsWith('#')) return value.slice(0, 7);
  if (/^([0-9a-f]{6})$/i.test(value)) return `#${value}`;
  return '#000000';
}

export function gridToMatrix(grid: PixelColorGrid): string[][] {
  const { size, colors } = grid;
  const matrix: string[][] = [];
  for (let row = 0; row < size; row += 1) {
    const start = row * size;
    matrix.push(colors.slice(start, start + size).map(normalizeColor));
  }
  return matrix;
}

export function gridToSvg(grid: PixelColorGrid, pixelSize = 12): string {
  const matrix = gridToMatrix(grid);
  const viewSize = grid.size * pixelSize;
  const rects = matrix
    .map((row, y) =>
      row
        .map(
          (color, x) =>
            `<rect x="${x * pixelSize}" y="${y * pixelSize}" width="${pixelSize}" height="${pixelSize}" fill="${color}" />`,
        )
        .join(''),
    )
    .join('');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${viewSize}" height="${viewSize}" shape-rendering="crispEdges">${rects}</svg>`;
}

export function flattenMatrix(matrix: string[][]): PixelColorGrid {
  const size = matrix.length;
  return {
    size,
    colors: matrix.flat().map(normalizeColor),
  };
}
