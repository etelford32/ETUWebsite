"use client"

import { useMemo, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { getAllBosses, type Boss } from '@/data/bosses'

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'live', label: 'Live' },
  { key: 'in-development', label: 'In Development' },
] as const

type FilterKey = (typeof FILTERS)[number]['key']

function statusOrder(b: Boss) {
  return b.status === 'live' ? 0 : 1
}

export default function BossesIndexPage() {
  const all = useMemo(() => getAllBosses().slice().sort((a, b) => {
    const s = statusOrder(a) - statusOrder(b)
    if (s !== 0) return s
    return a.name.localeCompare(b.name)
  }), [])

  const [filter, setFilter] = useState<FilterKey>('all')

  const liveCount = all.filter(b => b.status === 'live').length
  const filtered = all.filter(b => filter === 'all' || b.status === filter)

  return (
    <>
      <Header />

      <main className="min-h-screen bg-deep-900 text-slate-100">
        <section className="max-w-7xl mx-auto px-4 lg:px-6 pt-16 pb-10">
          <div className="eyebrow mb-3">Adversaries</div>
          <h1 className="font-display text-4xl md:text-6xl font-bold etu-headline-grad tracking-tight">
            Adaptive AI Bosses. Memory Across Attempts.
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-slate-300">
            Bosses that study your tactics and evolve. Beat one and the next fight will be harder.{' '}
            <span className="font-mono text-cyan-300">{liveCount} live</span>,{' '}
            <span className="font-mono text-amber-300">{all.length - liveCount} in development</span>{' '}
            — total roster <span className="font-mono text-cyan-300">{all.length}</span>.
          </p>

          {/* Filter tabs */}
          <div className="mt-6 flex flex-wrap gap-2" role="tablist">
            {FILTERS.map(f => {
              const active = filter === f.key
              return (
                <button
                  key={f.key}
                  role="tab"
                  aria-selected={active}
                  onClick={() => setFilter(f.key)}
                  className={`
                    px-4 py-2 rounded-full font-display text-xs font-semibold
                    uppercase tracking-[0.18em] transition-all
                    ${active
                      ? 'bg-cyan-500/15 border border-cyan-400/50 text-cyan-200'
                      : 'bg-white/[0.03] border border-white/10 text-slate-400 hover:bg-white/[0.06] hover:text-slate-200'
                    }
                  `}
                >
                  {f.label}
                </button>
              )
            })}
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-4 lg:px-6 pb-12">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map(b => (
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
                  <div className="absolute top-3 right-3 flex flex-col items-end gap-2">
                    <span
                      className="etu-pill"
                      style={{
                        borderColor: b.color.primary + '66',
                        background: b.color.primary + '24',
                        color: b.color.accent,
                      }}
                    >
                      {b.tier}
                    </span>
                    {b.status === 'in-development' && (
                      <span className="etu-pill etu-pill--amber">
                        <span className="ping" /> Dev
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-5">
                  <div
                    className="font-display text-sm font-bold uppercase tracking-[0.14em] mb-2"
                    style={{ color: b.color.accent }}
                  >
                    {b.name}
                  </div>
                  <p className="text-sm text-slate-300 leading-snug line-clamp-3">
                    {b.tagline}
                  </p>
                  {(b.homeZone || b.homePlanet) && (
                    <div className="mt-3 text-xs font-mono text-slate-500 truncate">
                      {b.homeZone}
                      {b.homeZone && b.homePlanet ? ' · ' : ''}
                      {b.homePlanet}
                    </div>
                  )}
                  <div className="mt-4 inline-flex items-center gap-2 font-display text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-300 group-hover:text-cyan-200">
                    View Boss Dossier
                    <span aria-hidden>→</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Arena strip — bosses get more terrifying when you've actually fought one */}
        <section className="max-w-7xl mx-auto px-4 lg:px-6 pb-24">
          <div className="etu-glass p-6 md:p-8 flex flex-col md:flex-row items-center gap-6 text-center md:text-left">
            <div className="flex-1">
              <div className="eyebrow mb-2">Active Theatre</div>
              <h3 className="font-display text-2xl font-bold etu-headline-grad mb-2">
                Adaptive AI you can fight today
              </h3>
              <p className="text-slate-300">
                The Megabot Arena runs the same adaptive AI you&apos;ll see across the
                full roster — every fifth wave is a boss formation. See how far you can
                push before it answers in kind.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <Link
                href="/missile-game"
                className="btn-3d btn-3d-red px-6 py-3 text-sm"
              >
                ▶ Play Megabot Arena
              </Link>
              <Link href="/leaderboard?mode=megabot" className="btn-ghost">
                🏆 Leaderboard
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  )
}
