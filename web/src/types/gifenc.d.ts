declare module 'gifenc' {
  export interface GifPaletteOptions {
    palette: Uint8Array;
    delay?: number;
    dispose?: number;
  }

  export interface GifEncoder {
    writeFrame(indexedPixels: Uint8Array, width: number, height: number, options: GifPaletteOptions): void;
    finish(): void;
    bytes(): Uint8Array;
  }

  export function GIFEncoder(): GifEncoder;
  export function quantize(rgba: Uint8Array, maxColors?: number): Uint8Array;
  export function applyPalette(rgba: Uint8Array, palette: Uint8Array, opts?: { transparent?: number }): Uint8Array;
}
