import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getArtwork } from '@/server/memory-store';
import { ArtworkDetail } from '@/components/artwork-detail';

interface Props {
  searchParams: { id?: string };
}

export default function ArtworkDetailPage({ searchParams }: Props) {
  const id = searchParams.id;
  if (!id) {
    notFound();
  }
  const artwork = getArtwork(id);
  if (!artwork) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 space-y-6">
      <Link href="/community" className="text-sm text-white/60 hover:text-white">
        ← Back to community
      </Link>
      <ArtworkDetail artwork={artwork} />
    </main>
  );
}
