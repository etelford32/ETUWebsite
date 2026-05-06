"use client"

import Link from 'next/link'
import Image from 'next/image'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { getAllZones, getBossesForZone } from '@/data/zones'

export default function ZonesIndexPage() {
  const zones = getAllZones()
  const totalBosses = zones.reduce((n, z) => n + getBossesForZone(z.id).length, 0)

  return (
    <>
      <Header />

      <main className="min-h-screen bg-deep-900 text-slate-100">
        <section className="max-w-7xl mx-auto px-4 lg:px-6 pt-16 pb-10">
          <div className="eyebrow mb-3">Star Atlas</div>
          <h1 className="font-display text-4xl md:text-6xl font-bold etu-headline-grad tracking-tight">
            16 Zones. Every Sector Has a Boss.
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-slate-300">
            The galaxy is divided into sixteen contested zones, each with its own
            biology, factions, and adversaries. Pick a zone to see its boss roster.{' '}
            <span className="font-mono text-cyan-300">{zones.length}</span> zones,{' '}
            <span className="font-mono text-cyan-300">{totalBosses}</span> bosses placed.
          </p>
        </section>

        <section className="max-w-7xl mx-auto px-4 lg:px-6 pb-24">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {zones.map(z => {
              const bossCount = getBossesForZone(z.id).length
              return (
                <Link
                  key={z.id}
                  href={`/zones/${z.id}`}
                  className="etu-glass group relative overflow-hidden block transition-transform hover:-translate-y-0.5"
                  style={{ borderColor: z.color.primary + '40' }}
                >
                  <div className="relative aspect-[4/3] overflow-hidden">
                    <Image
                      src={z.heroImage}
                      alt={z.fullName}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                      sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 320px"
                    />
                    <div
                      className="absolute inset-0"
                      style={{
                        background:
                          'linear-gradient(to top, rgba(2,6,23,0.95) 0%, rgba(2,6,23,0.45) 55%, rgba(2,6,23,0.15) 100%)',
                      }}
                    />
                    <div
                      className="absolute top-3 left-3 font-mono tabular-nums text-[10px] font-bold uppercase tracking-[0.18em] px-2 py-1 rounded-sm"
                      style={{
                        background: z.color.primary + '24',
                        border: `1px solid ${z.color.primary}66`,
                        color: z.color.accent,
                      }}
                    >
                      Zone {String(z.number).padStart(2, '0')}
                    </div>
                    <div
                      className="absolute inset-x-0 bottom-0 h-px"
                      style={{
                        background: `linear-gradient(90deg, transparent, ${z.color.primary}, transparent)`,
                        opacity: 0.7,
                      }}
                    />
                  </div>

                  <div className="p-5">
                    <div
                      className="font-display text-sm font-bold uppercase tracking-[0.14em] mb-2"
                      style={{ color: z.color.accent }}
                    >
                      {z.name}
                    </div>
                    <p className="text-sm text-slate-300 leading-snug line-clamp-2">
                      {z.tagline}
                    </p>
                    <div className="mt-3 flex items-center justify-between text-xs">
                      <span className="font-mono tabular-nums text-slate-400">
                        {bossCount === 0
                          ? 'No bosses yet'
                          : `${bossCount} boss${bossCount === 1 ? '' : 'es'}`}
                      </span>
                      <span className="font-display text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-300 group-hover:text-cyan-200">
                        View →
                      </span>
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
