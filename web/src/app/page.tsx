import Link from 'next/link';
import type { Route } from 'next';

const highlights: Array<{ title: string; body: string; href: Route }> = [
  {
    title: 'Pixel Generation Studio',
    body: 'Spin up multiple LLMs in parallel and watch them stream JSON-to-pixels end to end.',
    href: '/generate',
  },
  {
    title: 'Community Gallery',
    body: 'Publish your sprites, browse other creators, and keep everything shareable in one place.',
    href: '/community',
  },
  {
    title: 'Model Leaderboard',
    body: 'Rank models by community love to see which ones deliver the strongest pixel work.',
    href: '/leaderboard',
  },
];

const steps = [
  'Store your OpenRouter key and display handle locally in the browser.',
  'Pick a few models, craft a prompt, and stream their structured reasoning.',
  'Publish your favorite output straight into the community gallery.',
];

export default function LandingPage() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-12 px-4 py-12">
      <section className="rounded-3xl border border-white/10 bg-gradient-to-br from-brand-500/30 via-brand-500/5 to-transparent p-10 shadow-glow">
        <p className="mb-4 text-xs uppercase tracking-[0.3em] text-white/60">AssetGen · Pixel Foundry</p>
        <h1 className="text-4xl font-semibold leading-tight md:text-5xl">Run your AI asset pipeline from one hub</h1>
        <p className="mt-4 max-w-3xl text-lg text-white/80">
          AssetGen connects OpenRouter calls, storage, and ranking so pixel sprites flow from prompt to gallery. Future drops like SVGs, shaders, and music plug into the same surface.
        </p>
        <div className="mt-8 flex flex-wrap gap-4">
          <Link
            href="/generate"
            className="rounded-2xl bg-brand-500 px-6 py-3 text-lg font-semibold shadow-glow transition hover:bg-brand-400"
          >
            Open the Pixel Lab
          </Link>
          <Link
            href="/community"
            className="rounded-2xl border border-white/30 px-6 py-3 text-lg text-white/80 transition hover:border-white/60"
          >
            View the Gallery
          </Link>
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-3">
        {highlights.map((item) => (
          <Link
            key={item.title}
            href={item.href}
            className="rounded-2xl border border-white/10 bg-black/20 p-5 transition hover:border-brand-400"
          >
            <h2 className="text-xl font-semibold">{item.title}</h2>
            <p className="mt-2 text-sm text-white/70">{item.body}</p>
            <span className="mt-6 inline-flex items-center text-sm text-brand-300">
              Explore →
            </span>
          </Link>
        ))}
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/5 p-8">
        <h2 className="text-2xl font-semibold">Get started in three steps</h2>
        <ol className="mt-6 space-y-4 text-white/80">
          {steps.map((step, index) => (
            <li key={step} className="flex items-start gap-4">
              <span className="flex h-10 w-10 items-center justify-center rounded-full border border-white/30 text-lg font-semibold">
                {index + 1}
              </span>
              <p className="pt-2 text-base">{step}</p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
