export type ArtworkKind = 'pixel_image';

export interface PixelColorGrid {
  size: number;
  colors: string[]; // flattened size*size list
}

export interface Artwork {
  id: string;
  kind: ArtworkKind;
  title: string;
  prompt: string;
  model: string;
  authorHandle: string;
  grid: PixelColorGrid;
  previewSvg: string;
  palette: string[];
  steps: PixelArtStep[];
  durationMs: number;
  createdAt: string;
  likes: number;
}

export interface LeaderboardEntry extends Artwork {
  rank: number;
}

export interface ModelSummary {
  id: string;
  name: string;
  description?: string;
  contextLength?: number;
  pricing?: {
    prompt?: string;
    completion?: string;
  };
}

export interface GenerationRequest {
  prompt: string;
  gridSize: number;
  paletteLimit?: number;
  model: string;
  apiKey: string;
}

export interface PixelStroke {
  x: number;
  y: number;
  ci: number;
}

export type PixelTool =
  | {
      kind: 'fillRect';
      x: number;
      y: number;
      width: number;
      height: number;
      ci: number;
    }
  | {
    kind: 'fillCircle';
    cx: number;
    cy: number;
    radius: number;
    ci: number;
  }
  | {
    kind: 'line';
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    ci: number;
  };

export interface PixelArtStep {
  description: string;
  pixels: PixelStroke[];
  tool?: PixelTool;
}

export interface GeneratedPixelArt {
  title: string;
  description: string;
  grid: PixelColorGrid;
  palette: string[];
  steps: PixelArtStep[];
}
