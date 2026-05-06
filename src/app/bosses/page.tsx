"use client"

import Link from 'next/link'
import Image from 'next/image'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { getAllBosses } from '@/data/bosses'

const TOTAL_PLANNED = 17

export default function BossesIndexPage() {
  const bosses = getAllBosses()

  return (
    <>
      <Header />

      <main className="min-h-screen bg-deep-900 text-slate-100">
        <section className="max-w-7xl mx-auto px-4 lg:px-6 pt-16 pb-10">
          <div className="eyebrow mb-3">Adversaries</div>
          <h1 className="font-display text-4xl md:text-6xl font-bold etu-headline-grad tracking-tight">
            {TOTAL_PLANNED} Bosses. Memory Across Attempts.
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-slate-300">
            Adaptive AI bosses that study your tactics and evolve. Beat them once,
            and the next fight will be harder.{' '}
            <span className="font-mono text-cyan-300">
              {bosses.length}/{TOTAL_PLANNED}
            </span>{' '}
            published so far.
          </p>
        </section>

        <section className="max-w-7xl mx-auto px-4 lg:px-6 pb-24">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {bosses.map(b => (
              <Link
                key={b.id}
                href={`/bosses/${b.id}`}
                className="etu-glass group relative overflow-hidden block transition-transform hover:-translate-y-0.5"
                style={{ borderColor: b.color.primary + '40' }}
              >
                <div className="relative aspect-[4/3] overflow-hidden">
                  <Image
                    src={b.heroImage}
                    alt={b.name}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 420px"
                  />
                  <div
                    className="absolute inset-0"
                    style={{
                      background:
                        'linear-gradient(to top, rgba(2,6,23,0.95) 0%, rgba(2,6,23,0.45) 55%, rgba(2,6,23,0.15) 100%)',
                    }}
                  />
                </div>

                <div className="p-5">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div
                      className="font-display text-xs font-semibold uppercase tracking-[0.18em]"
                      style={{ color: b.color.accent }}
                    >
                      {b.name}
                    </div>
                    <span
                      className="etu-pill"
                      style={{
                        borderColor: b.color.primary + '66',
                        background: b.color.primary + '14',
                        color: b.color.accent,
                      }}
                    >
                      {b.tier}
                    </span>
                  </div>
                  <p className="text-sm text-slate-300 leading-snug line-clamp-3">
                    {b.tagline}
                  </p>
                  <div className="mt-4 inline-flex items-center gap-2 font-display text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-300 group-hover:text-cyan-200">
                    View Boss Dossier
                    <span aria-hidden>→</span>
                  </div>
                </div>
              </Link>
            ))}

            <div className="etu-glass p-6 flex flex-col items-start justify-between min-h-[260px]">
              <div>
                <div className="eyebrow mb-2">Classified</div>
                <div className="font-display text-lg font-bold text-slate-200 mb-1">
                  +{Math.max(0, TOTAL_PLANNED - bosses.length)} More Bosses
                </div>
                <p className="text-sm text-slate-400">
                  Sector tyrants, Galactic threats, and one God-tier surprise.
                  Dossiers ship as the alpha grows.
                </p>
              </div>
              <Link href="/devlog" className="btn-ghost mt-5">
                Read the Devlog
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  )
}
