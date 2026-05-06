"use client"

import Link from 'next/link'
import Image from 'next/image'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { getAllFactions } from '@/data/factions'

const TOTAL_PLANNED = 17

export default function FactionsIndexPage() {
  const factions = getAllFactions()

  return (
    <>
      <Header />

      <main className="min-h-screen bg-deep-900 text-slate-100">
        <section className="max-w-7xl mx-auto px-4 lg:px-6 pt-16 pb-10">
          <div className="eyebrow mb-3">Pick Your Allegiance</div>
          <h1 className="font-display text-4xl md:text-6xl font-bold etu-headline-grad tracking-tight">
            {TOTAL_PLANNED} Factions. One Galaxy at War.
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-slate-300">
            A taste of the roster, Commander. Choose carefully — every alliance closes another door.{' '}
            <span className="font-mono text-cyan-300">
              {factions.length}/{TOTAL_PLANNED}
            </span>{' '}
            published so far.
          </p>
        </section>

        <section className="max-w-7xl mx-auto px-4 lg:px-6 pb-24">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {factions.map(f => (
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
                  <div className="mt-4 inline-flex items-center gap-2 font-display text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-300 group-hover:text-cyan-200">
                    View Faction
                    <span aria-hidden>→</span>
                  </div>
                </div>
              </Link>
            ))}

            {/* "More coming" placeholder card */}
            <div className="etu-glass p-6 flex flex-col items-start justify-between min-h-[260px]">
              <div>
                <div className="eyebrow mb-2">In Development</div>
                <div className="font-display text-lg font-bold text-slate-200 mb-1">
                  +{Math.max(0, TOTAL_PLANNED - factions.length)} More Factions
                </div>
                <p className="text-sm text-slate-400">
                  Theorists, Builders, Ursos, Pirates, Cults — the galaxy is crowded.
                  Profiles ship as the alpha grows.
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
