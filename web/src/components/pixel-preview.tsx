'use client';

import { memo } from 'react';
import { gridToMatrix } from '@/lib/pixel';
import { PixelColorGrid } from '@/lib/types';

interface Props {
  grid: PixelColorGrid;
  pixelSize?: number;
  maxDisplaySize?: number;
  className?: string;
}

function PixelPreviewComponent({ grid, pixelSize, maxDisplaySize, className }: Props) {
  const matrix = gridToMatrix(grid);
  const autoPixel = maxDisplaySize ? Math.floor(maxDisplaySize / Math.max(grid.size, 1)) : undefined;
  const resolvedPixelSize = Math.max(2, pixelSize ?? autoPixel ?? 12);
  const contentWidth = resolvedPixelSize * grid.size;

  return (
    <div
      className={`rounded-xl border border-white/10 bg-black/30 p-4 shadow-lg overflow-auto ${className ?? ''}`}
      style={maxDisplaySize ? { maxWidth: maxDisplaySize + 32 } : undefined}
    >
      <div
        className="inline-grid"
        style={{
          gridTemplateColumns: `repeat(${matrix.length}, ${resolvedPixelSize}px)`,
          gap: 0,
          width: contentWidth,
        }}
      >
        {matrix.map((row, rowIndex) =>
          row.map((color, colIndex) => (
            <span
              key={`${rowIndex}-${colIndex}`}
              className="aspect-square"
              style={{
                width: resolvedPixelSize,
                height: resolvedPixelSize,
                backgroundColor: color,
              }}
            />
          )),
        )}
      </div>
    </div>
  );
}

export const PixelPreview = memo(PixelPreviewComponent);
