"use client"

import { useMemo, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { getAllFactions, type Faction } from '@/data/factions'

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'live', label: 'Live' },
  { key: 'in-development', label: 'In Development' },
] as const

type FilterKey = (typeof FILTERS)[number]['key']

function statusOrder(f: Faction) {
  return (f.status ?? 'live') === 'live' ? 0 : 1
}

export default function FactionsIndexPage() {
  const all = useMemo(
    () =>
      getAllFactions()
        .slice()
        .sort((a, b) => {
          const s = statusOrder(a) - statusOrder(b)
          if (s !== 0) return s
          return a.name.localeCompare(b.name)
        }),
    []
  )

  const [filter, setFilter] = useState<FilterKey>('all')
  const liveCount = all.filter(f => (f.status ?? 'live') === 'live').length
  const filtered = all.filter(f => filter === 'all' || (f.status ?? 'live') === filter)

  return (
    <>
      <Header />

      <main className="min-h-screen bg-deep-900 text-slate-100">
        <section className="max-w-7xl mx-auto px-4 lg:px-6 pt-16 pb-10">
          <div className="eyebrow mb-3">Pick Your Allegiance</div>
          <h1 className="font-display text-4xl md:text-6xl font-bold etu-headline-grad tracking-tight">
            One Galaxy at War.
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-slate-300">
            A taste of the roster, Commander. Choose carefully — every alliance closes another door.{' '}
            <span className="font-mono text-cyan-300">{liveCount} live</span>,{' '}
            <span className="font-mono text-amber-300">{all.length - liveCount} in development</span>{' '}
            — total roster <span className="font-mono text-cyan-300">{all.length}</span>.
          </p>

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

        <section className="max-w-7xl mx-auto px-4 lg:px-6 pb-24">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filtered.map(f => {
              const isStub = f.status === 'in-development'
              return (
                <Link
                  key={f.id}
                  href={`/factions/${f.id}`}
                  className="etu-glass group relative overflow-hidden block transition-transform hover:-translate-y-0.5"
                  style={{
                    borderColor: f.color.primary + '40',
                  }}
                >
                  <div className="relative aspect-[4/3] overflow-hidden">
                    <Image
                      src={f.heroImage}
                      alt={f.name}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                      sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 320px"
                    />
                    <div
                      className="absolute inset-0"
                      style={{
                        background: `linear-gradient(to top, rgba(2,6,23,0.95) 0%, rgba(2,6,23,0.45) 55%, rgba(2,6,23,0.15) 100%)`,
                      }}
                    />
                    {isStub && (
                      <span className="absolute top-3 right-3 etu-pill etu-pill--amber">
                        <span className="ping" /> Dev
                      </span>
                    )}
                    <div
                      className="absolute inset-x-0 bottom-0 h-px"
                      style={{
                        background: `linear-gradient(90deg, transparent, ${f.color.primary}, transparent)`,
                        opacity: 0.7,
                      }}
                    />
                  </div>

                  <div className="p-5">
                    <div
                      className="font-display text-xs font-semibold uppercase tracking-[0.18em] mb-2"
                      style={{ color: f.color.accent }}
                    >
                      {f.name}
                    </div>
                    <p className="text-sm text-slate-300 leading-snug line-clamp-3">
                      {f.tagline}
                    </p>
                    {(f.homeZone || f.homePlanet) && (
                      <div className="mt-3 text-xs font-mono text-slate-500 truncate">
                        {f.homeZone}
                        {f.homeZone && f.homePlanet ? ' · ' : ''}
                        {f.homePlanet}
                      </div>
                    )}
                    <div className="mt-4 inline-flex items-center gap-2 font-display text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-300 group-hover:text-cyan-200">
                      View Faction
                      <span aria-hidden>→</span>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </section>
      </main>

      <Footer />
    </>
  )
}
