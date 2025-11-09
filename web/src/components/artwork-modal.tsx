'use client';

import { Artwork } from '@/lib/types';
import { ArtworkDetail } from './artwork-detail';

interface Props {
  artwork: Artwork;
  onClose: () => void;
}

export function ArtworkModal({ artwork, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="relative max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-3xl border border-white/10 bg-[#05060a] p-6 shadow-glow">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full border border-white/30 px-3 py-1 text-sm text-white/70 transition hover:border-red-400 hover:text-red-200"
        >
          Close
        </button>
        <ArtworkDetail artwork={artwork} />
      </div>
    </div>
  );
}
