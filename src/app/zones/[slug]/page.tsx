"use client"

import { useEffect, useMemo } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { getAllZones, getBossesForZone, getZone } from '@/data/zones'
import { getFaction } from '@/data/factions'

export default function ZonePage() {
  const params = useParams()
  const slug = params?.slug as string
  const zone = getZone(slug)

  useEffect(() => {
    const io = new IntersectionObserver(
      entries => {
        entries.forEach(e => {
          if (e.isIntersecting) e.target.classList.add('show')
        })
      },
      { threshold: 0.12 }
    )
    document.querySelectorAll('.reveal').forEach(el => io.observe(el))
    return () => io.disconnect()
  }, [])

  const bosses = useMemo(() => (zone ? getBossesForZone(zone.id) : []), [zone])

  // Distinct factions present in this zone — derived from the boss roster.
  const factions = useMemo(() => {
    if (!zone) return []
    const seen = new Set<string>()
    const out: { id: string; name: string; accent: string }[] = []
    for (const b of bosses) {
      if (!b.factionId || seen.has(b.factionId)) continue
      const f = getFaction(b.factionId)
      if (!f) continue
      seen.add(f.id)
      out.push({ id: f.id, name: f.name, accent: f.color.accent })
    }
    return out
  }, [bosses, zone])

  const allZones = getAllZones()
  const idx = zone ? allZones.findIndex(z => z.id === zone.id) : -1
  const prev = idx > 0 ? allZones[idx - 1] : undefined
  const next = idx >= 0 && idx < allZones.length - 1 ? allZones[idx + 1] : undefined

  if (!zone) {
    return (
      <>
        <Header />
        <main className="min-h-screen flex items-center justify-center bg-deep-900">
          <div className="text-center max-w-md px-4">
            <div className="eyebrow mb-3">404 · Off Map</div>
            <h1 className="font-display text-4xl font-bold etu-headline-grad mb-4">
              Zone Not Found
            </h1>
            <p className="text-slate-300 mb-8">
              No zone matches that designation.
            </p>
            <Link href="/zones" className="btn-ghost">
              Back to Zones
            </Link>
          </div>
        </main>
        <Footer />
      </>
    )
  }

  const liveCount = bosses.filter(b => b.status === 'live').length
  const devCount = bosses.length - liveCount

  return (
    <>
      <Header />

      <main className="min-h-screen bg-deep-900 text-slate-100">
        {/* Hero */}
        <section
          className="relative h-[55vh] min-h-[460px] flex items-end overflow-hidden"
          style={{
            background: `linear-gradient(135deg, ${zone.color.primary}22 0%, ${zone.color.secondary}11 100%)`,
          }}
        >
          <div className="absolute inset-0 opacity-40">
            <Image
              src={zone.heroImage}
              alt={zone.fullName}
              fill
              className="object-cover"
              priority
              sizes="100vw"
            />
            <div
              className="absolute inset-0"
              style={{
                background:
                  'linear-gradient(to top, rgba(2,6,23,1) 0%, rgba(2,6,23,0.7) 50%, rgba(2,6,23,0.3) 100%)',
              }}
            />
          </div>

          <div className="relative z-10 w-full max-w-7xl mx-auto px-4 lg:px-6 pb-12">
            <div className="reveal">
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <span
                  className="font-mono tabular-nums text-xs font-bold uppercase tracking-[0.18em] px-2.5 py-1 rounded-sm"
                  style={{
                    background: zone.color.primary + '24',
                    border: `1px solid ${zone.color.primary}66`,
                    color: zone.color.accent,
                  }}
                >
                  Zone {String(zone.number).padStart(2, '0')}
                </span>
                <Link
                  href="/zones"
                  className="eyebrow text-slate-400 hover:text-slate-200 transition-colors"
                  style={{ textShadow: '0 1px 6px rgba(0,0,0,.9)' }}
                >
                  ← All Zones
                </Link>
              </div>
              <h1
                className="font-display text-5xl md:text-7xl font-bold tracking-tight"
                style={{ textShadow: '0 4px 24px rgba(0,0,0,.6)' }}
              >
                <span className="etu-headline-grad">{zone.name}</span>
              </h1>
              <p className="mt-4 text-xl md:text-2xl text-slate-200 max-w-2xl">
                {zone.tagline}
              </p>
            </div>
          </div>
        </section>

        {/* Stats strip */}
        <section className="border-y border-white/10 bg-white/[0.02]">
          <div className="max-w-7xl mx-auto px-4 lg:px-6 py-6 grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <div className="eyebrow mb-1">Designation</div>
              <div className="font-mono tabular-nums text-lg text-cyan-300">
                {zone.fullName}
              </div>
            </div>
            <div>
              <div className="eyebrow mb-1">Bosses Placed</div>
              <div className="font-mono tabular-nums text-lg text-cyan-300">
                {bosses.length}
              </div>
            </div>
            <div>
              <div className="eyebrow mb-1">Live</div>
              <div className="font-mono tabular-nums text-lg text-emerald-300">
                {liveCount}
              </div>
            </div>
            <div>
              <div className="eyebrow mb-1">In Development</div>
              <div className="font-mono tabular-nums text-lg text-amber-300">
                {devCount}
              </div>
            </div>
          </div>
        </section>

        {/* Description */}
        <section className="py-16">
          <div className="max-w-4xl mx-auto px-4 lg:px-6">
            <div className="reveal">
              <div className="eyebrow mb-3">Sector Brief</div>
              <h2 className="font-display text-3xl md:text-4xl font-bold mb-5 etu-headline-grad">
                What you&apos;re flying into
              </h2>
              <p className="text-lg text-slate-300 leading-relaxed">
                {zone.description}
              </p>
            </div>
          </div>
        </section>

        {/* Factions present */}
        {factions.length > 0 && (
          <section className="py-12 border-t border-white/10">
            <div className="max-w-7xl mx-auto px-4 lg:px-6">
              <div className="reveal mb-6">
                <div className="eyebrow mb-3">Factions Active in this Zone</div>
                <h2 className="font-display text-2xl font-bold etu-headline-grad">
                  Who flies the flag
                </h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {factions.map(f => (
                  <Link
                    key={f.id}
                    href={`/factions/${f.id}`}
                    className="etu-pill hover:scale-[1.02] transition-transform"
                    style={{
                      borderColor: f.accent + '66',
                      background: f.accent + '14',
                      color: f.accent,
                    }}
                  >
                    {f.name}
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Boss roster */}
        <section className="py-16 border-t border-white/10">
          <div className="max-w-7xl mx-auto px-4 lg:px-6">
            <div className="reveal mb-8">
              <div className="eyebrow mb-3">Boss Roster</div>
              <h2 className="font-display text-3xl md:text-4xl font-bold etu-headline-grad">
                Adversaries in {zone.name}
              </h2>
              <p className="text-slate-400 mt-2">
                {bosses.length === 0 ? (
                  <>No bosses placed in this zone yet — roster ships as the alpha grows.</>
                ) : (
                  <>
                    <span className="font-mono text-cyan-300">{bosses.length}</span>{' '}
                    boss{bosses.length === 1 ? '' : 'es'} flagged for {zone.fullName}.
                  </>
                )}
              </p>
            </div>

            {bosses.length === 0 ? (
              <div className="etu-glass p-10 text-center">
                <div className="eyebrow mb-2 text-amber-300">Roster Pending</div>
                <p className="text-slate-300">
                  We haven&apos;t published a boss for this zone yet. Watch the devlog —
                  rosters ship in waves alongside the alpha builds.
                </p>
                <Link href="/devlog" className="btn-ghost mt-6 inline-flex">
                  Read the Devlog
                </Link>
              </div>
            ) : (
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
                      {b.homePlanet && (
                        <div className="mt-3 text-xs font-mono text-slate-500 truncate">
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
            )}
          </div>
        </section>

        {/* Prev / Next zone nav */}
        <section className="py-10 border-t border-white/10">
          <div className="max-w-7xl mx-auto px-4 lg:px-6 flex items-center justify-between gap-4">
            {prev ? (
              <Link
                href={`/zones/${prev.id}`}
                className="etu-glass flex items-center gap-3 px-5 py-3 transition-transform hover:-translate-x-0.5 max-w-[48%]"
              >
                <span className="font-display text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  ← Zone {String(prev.number).padStart(2, '0')}
                </span>
                <span className="font-display text-sm truncate" style={{ color: prev.color.accent }}>
                  {prev.name}
                </span>
              </Link>
            ) : (
              <span />
            )}
            {next ? (
              <Link
                href={`/zones/${next.id}`}
                className="etu-glass flex items-center gap-3 px-5 py-3 transition-transform hover:translate-x-0.5 max-w-[48%]"
              >
                <span className="font-display text-sm truncate" style={{ color: next.color.accent }}>
                  {next.name}
                </span>
                <span className="font-display text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Zone {String(next.number).padStart(2, '0')} →
                </span>
              </Link>
            ) : (
              <span />
            )}
          </div>
        </section>
      </main>

      <Footer />
    </>
  )
}
