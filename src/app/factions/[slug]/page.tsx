"use client"

import { useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { getFaction } from '@/data/factions'
import { getBossesForFaction } from '@/data/bosses'
import { getAllZones } from '@/data/zones'

export default function FactionPage() {
  const params = useParams()
  const slug = params?.slug as string
  const faction = getFaction(slug)

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

  if (!faction) {
    return (
      <>
        <Header />
        <main className="min-h-screen flex items-center justify-center bg-deep-900">
          <div className="text-center max-w-md px-4">
            <div className="eyebrow mb-3">404 · Off Map</div>
            <h1 className="font-display text-4xl font-bold etu-headline-grad mb-4">
              Faction Not Found
            </h1>
            <p className="text-slate-300 mb-8">
              The faction you&apos;re looking for doesn&apos;t exist in this sector.
            </p>
            <Link href="/factions" className="btn-ghost">
              Back to Factions
            </Link>
          </div>
        </main>
        <Footer />
      </>
    )
  }

  const shortName = faction.name.split('•')[0].trim()
  const isStub = faction.status === 'in-development'
  const bosses = getBossesForFaction(faction.id)
  const homeZoneObj = (() => {
    if (!faction.homeZone) return undefined
    const haystack = faction.homeZone.toLowerCase()
    return getAllZones().find(z => z.aliases.some(a => haystack.includes(a)))
  })()

  return (
    <>
      <Header />

      <main className="min-h-screen bg-deep-900 text-slate-100">
        {/* Hero */}
        <section
          className="relative h-[60vh] min-h-[500px] flex items-end overflow-hidden"
          style={{
            background: `linear-gradient(135deg, ${faction.color.primary}22 0%, ${faction.color.secondary}11 100%)`,
          }}
        >
          <div className="absolute inset-0 opacity-35">
            <Image
              src={faction.heroImage}
              alt={faction.name}
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
                  className="etu-pill"
                  style={{
                    borderColor: faction.color.primary + '66',
                    background: faction.color.primary + '14',
                    color: faction.color.accent,
                  }}
                >
                  Playable Faction
                </span>
                {isStub && (
                  <span className="etu-pill etu-pill--amber">
                    <span className="ping" /> Profile In Development
                  </span>
                )}
                <Link
                  href="/factions"
                  className="eyebrow text-slate-400 hover:text-slate-200 transition-colors"
                  style={{ textShadow: '0 1px 6px rgba(0,0,0,.9)' }}
                >
                  ← All Factions
                </Link>
              </div>
              <h1
                className="font-display text-5xl md:text-7xl font-bold tracking-tight"
                style={{ textShadow: '0 4px 24px rgba(0,0,0,.6)' }}
              >
                <span className="etu-headline-grad">{faction.name}</span>
              </h1>
              <p className="mt-4 text-xl md:text-2xl text-slate-200 max-w-2xl">
                {faction.tagline}
              </p>
            </div>
          </div>
        </section>

        {/* Home zone / planet strip */}
        {(faction.homeZone || faction.homePlanet) && (
          <section className="border-y border-white/10 bg-white/[0.02]">
            <div className="max-w-7xl mx-auto px-4 lg:px-6 py-6 grid grid-cols-2 md:grid-cols-3 gap-6">
              {faction.homeZone && (
                <div>
                  <div className="eyebrow mb-1">Home Zone</div>
                  {homeZoneObj ? (
                    <Link
                      href={`/zones/${homeZoneObj.id}`}
                      className="font-mono tabular-nums text-lg text-cyan-300 hover:text-cyan-200 hover:underline"
                    >
                      {faction.homeZone}
                    </Link>
                  ) : (
                    <div className="font-mono tabular-nums text-lg text-cyan-300">
                      {faction.homeZone}
                    </div>
                  )}
                </div>
              )}
              {faction.homePlanet && (
                <div>
                  <div className="eyebrow mb-1">Home Planet</div>
                  <div className="font-mono tabular-nums text-lg text-cyan-300">
                    {faction.homePlanet}
                  </div>
                </div>
              )}
              <div>
                <div className="eyebrow mb-1">Status</div>
                <div
                  className={`font-mono tabular-nums text-lg ${
                    isStub ? 'text-amber-300' : 'text-emerald-300'
                  }`}
                >
                  {isStub ? 'In Development' : 'Live'}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Overview — only when faction has a full profile */}
        {(faction.description || faction.playstyle || faction.abilities) && (
          <section className="py-16">
            <div className="max-w-7xl mx-auto px-4 lg:px-6">
              <div className="grid lg:grid-cols-2 gap-8 items-start">
                {(faction.description || faction.playstyle) && (
                  <div className="reveal">
                    <div className="eyebrow mb-3">Overview</div>
                    <h2 className="font-display text-3xl font-bold mb-5 etu-headline-grad">
                      Who they are
                    </h2>
                    {faction.description && (
                      <p className="text-lg text-slate-300 leading-relaxed mb-6">
                        {faction.description}
                      </p>
                    )}
                    {faction.playstyle && (
                      <div
                        className="etu-glass p-6"
                        style={{
                          borderColor: faction.color.primary + '40',
                          background: faction.color.primary + '0E',
                        }}
                      >
                        <div className="eyebrow mb-2" style={{ color: faction.color.accent }}>
                          Playstyle
                        </div>
                        <p className="text-slate-200 leading-relaxed">{faction.playstyle}</p>
                      </div>
                    )}
                  </div>
                )}

                {faction.abilities && faction.abilities.length > 0 && (
                  <div className="reveal">
                    <div className="eyebrow mb-3">Doctrine</div>
                    <h2 className="font-display text-3xl font-bold mb-5 etu-headline-grad">
                      Key Abilities
                    </h2>
                    <div className="space-y-3">
                      {faction.abilities.map((ability, idx) => (
                        <div
                          key={idx}
                          className="etu-glass flex items-start gap-3 p-4"
                        >
                          <div
                            className="font-mono tabular-nums w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-sm font-bold"
                            style={{
                              background: faction.color.primary + '24',
                              color: faction.color.accent,
                              border: `1px solid ${faction.color.primary}55`,
                            }}
                          >
                            {String(idx + 1).padStart(2, '0')}
                          </div>
                          <div className="font-display text-sm font-semibold tracking-wide">
                            {ability}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Stub fallback — shown when the faction profile is still in development */}
        {isStub && !faction.description && (
          <section className="py-16">
            <div className="max-w-3xl mx-auto px-4 lg:px-6 text-center">
              <div className="reveal etu-glass p-10">
                <div className="eyebrow mb-3 text-amber-300">Profile In Development</div>
                <h2 className="font-display text-3xl font-bold mb-4 etu-headline-grad">
                  Full dossier ships as the alpha grows
                </h2>
                <p className="text-slate-300 leading-relaxed">
                  {shortName} is canon — playable in time, on the roadmap now. We&apos;re
                  publishing faction profiles in waves alongside the alpha builds.
                </p>
              </div>
            </div>
          </section>
        )}

        {/* Strengths & Weaknesses */}
        {((faction.strengths && faction.strengths.length > 0) ||
          (faction.weaknesses && faction.weaknesses.length > 0)) && (
          <section className="py-16 border-t border-white/10">
            <div className="max-w-7xl mx-auto px-4 lg:px-6">
              <div className="grid md:grid-cols-2 gap-6">
                {faction.strengths && faction.strengths.length > 0 && (
                  <div className="reveal etu-glass p-7">
                    <div className="flex items-center gap-3 mb-5">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center"
                        style={{ background: faction.color.primary + '24' }}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M5 13l4 4L19 7"
                            style={{ color: faction.color.accent }}
                          />
                        </svg>
                      </div>
                      <h2 className="font-display text-xl font-bold uppercase tracking-[0.14em]">
                        Strengths
                      </h2>
                    </div>
                    <ul className="space-y-3">
                      {faction.strengths.map((s, i) => (
                        <li key={i} className="flex items-start gap-3 text-slate-200">
                          <span
                            className="text-lg mt-0.5"
                            style={{ color: faction.color.primary }}
                          >
                            ✦
                          </span>
                          <span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {faction.weaknesses && faction.weaknesses.length > 0 && (
                  <div className="reveal etu-glass p-7">
                    <div className="flex items-center gap-3 mb-5">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center bg-rose-500/20">
                        <svg
                          className="w-5 h-5 text-rose-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </div>
                      <h2 className="font-display text-xl font-bold uppercase tracking-[0.14em]">
                        Weaknesses
                      </h2>
                    </div>
                    <ul className="space-y-3">
                      {faction.weaknesses.map((w, i) => (
                        <li key={i} className="flex items-start gap-3 text-slate-200">
                          <span className="text-lg mt-0.5 text-rose-400">✦</span>
                          <span>{w}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Boss Roster — links to bosses for this faction */}
        {bosses.length > 0 && (
          <section className="py-16 border-t border-white/10">
            <div className="max-w-7xl mx-auto px-4 lg:px-6">
              <div className="reveal mb-8">
                <div className="eyebrow mb-3">Boss Roster</div>
                <h2 className="font-display text-3xl md:text-4xl font-bold etu-headline-grad">
                  {shortName} Bosses
                </h2>
                <p className="text-slate-400 mt-2">
                  <span className="font-mono text-cyan-300">{bosses.length}</span>{' '}
                  boss{bosses.length === 1 ? '' : 'es'} flying this faction&apos;s flag.
                </p>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {bosses.map(boss => (
                  <Link
                    key={boss.id}
                    href={`/bosses/${boss.id}`}
                    className="etu-glass p-5 group transition-transform hover:-translate-y-0.5"
                    style={{ borderColor: boss.color.primary + '40' }}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div
                        className="font-display text-sm font-bold uppercase tracking-[0.14em]"
                        style={{ color: boss.color.accent }}
                      >
                        {boss.name}
                      </div>
                      <span
                        className="etu-pill text-[9px]"
                        style={{
                          borderColor: boss.color.primary + '66',
                          background: boss.color.primary + '14',
                          color: boss.color.accent,
                        }}
                      >
                        {boss.tier}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 line-clamp-2">{boss.tagline}</p>
                    {boss.status === 'in-development' && (
                      <div className="mt-3 text-[10px] font-display uppercase tracking-[0.18em] text-amber-300">
                        In Development
                      </div>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Units */}
        {faction.units && faction.units.length > 0 && (
          <section className="py-16 border-t border-white/10">
            <div className="max-w-7xl mx-auto px-4 lg:px-6">
              <div className="reveal mb-10">
                <div className="eyebrow mb-3">Roster</div>
                <h2 className="font-display text-3xl md:text-4xl font-bold etu-headline-grad">
                  Faction Units
                </h2>
                <p className="text-slate-400 mt-2">
                  Key vessels available to {shortName} commanders.
                </p>
              </div>
              <div className="grid md:grid-cols-3 gap-5">
                {faction.units.map((unit, idx) => (
                  <div key={idx} className="reveal etu-glass p-6">
                    <div
                      className="w-11 h-11 rounded-md flex items-center justify-center mb-4 font-mono tabular-nums font-bold"
                      style={{
                        background: faction.color.primary + '1A',
                        border: `1px solid ${faction.color.primary}55`,
                        color: faction.color.primary,
                      }}
                    >
                      {String(idx + 1).padStart(2, '0')}
                    </div>
                    <h3 className="font-display font-semibold text-lg mb-2">{unit.name}</h3>
                    <p className="text-sm text-slate-300 leading-relaxed">{unit.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Lore */}
        {faction.lore && (
          <section className="py-16 border-t border-white/10">
            <div className="max-w-4xl mx-auto px-4 lg:px-6">
              <div className="reveal">
                <div className="eyebrow mb-3">Origin & Lore</div>
                <h2 className="font-display text-3xl md:text-4xl font-bold mb-6 etu-headline-grad">
                  How they came to be
                </h2>
                <div
                  className="etu-glass p-8 border-l-2"
                  style={{
                    borderLeftColor: faction.color.primary,
                    background: faction.color.primary + '0A',
                  }}
                >
                  <p className="text-lg text-slate-200 leading-relaxed italic">
                    {faction.lore}
                  </p>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* CTA */}
        <section className="py-20 border-t border-white/10">
          <div className="max-w-4xl mx-auto px-4 lg:px-6 text-center">
            <div className="reveal">
              <h2 className="font-display text-3xl md:text-4xl font-bold mb-4 etu-headline-grad">
                Ready to Command {shortName}?
              </h2>
              <p className="text-lg text-slate-300 mb-8">
                Wishlist on Steam, or join the alpha now and help shape the galaxy.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <a
                  href="https://store.steampowered.com/app/4094340/Explore_the_Universe_2175/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-ghost"
                >
                  Wishlist on Steam
                </a>
                <Link href="/factions" className="btn-ghost">
                  View All Factions
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  )
}
