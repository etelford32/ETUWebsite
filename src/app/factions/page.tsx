"use client"

import { useMemo, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import WishlistButton from '@/components/WishlistButton'
import { getAllFactions, type Faction } from '@/data/factions'
import EtuTitle from '@/components/EtuTitle'

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'live', label: 'Live' },
  { key: 'in-development', label: 'In Development' },
] as const

type FilterKey = (typeof FILTERS)[number]['key']

// The order the war introduces them: the enemy, then the peoples caught in it.
const LIVE_ORDER = ['megabot', 'mycelari', 'space-dwarves', 'wild', 'lumari']

function isLive(f: Faction) {
  return (f.status ?? 'live') === 'live'
}

function splitName(name: string) {
  const [short, ...rest] = name.split('•')
  return { short: short.trim(), sub: rest.join('•').trim() }
}

export default function FactionsIndexPage() {
  const all = useMemo(() => getAllFactions(), [])
  const live = useMemo(
    () =>
      all
        .filter(isLive)
        .sort((a, b) => {
          const ai = LIVE_ORDER.indexOf(a.id)
          const bi = LIVE_ORDER.indexOf(b.id)
          return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi) || a.name.localeCompare(b.name)
        }),
    [all]
  )
  const inDev = useMemo(
    () => all.filter(f => !isLive(f)).sort((a, b) => a.name.localeCompare(b.name)),
    [all]
  )

  const [filter, setFilter] = useState<FilterKey>('all')
  const showLive = filter !== 'in-development'
  const showDev = filter !== 'live'

  return (
    <>
      <Header />

      <main className="min-h-screen bg-deep-900 text-slate-100">
        {/* Hero */}
        <section className="relative overflow-hidden border-b border-white/10">
          <Image
            src="/art/fleeing-the-colossal-megabot-scene.jpg"
            alt=""
            fill
            priority
            className="object-cover object-[50%_30%] opacity-50"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-deep-900/60 via-deep-900/70 to-deep-900" />
          <div className="absolute inset-0 bg-gradient-to-r from-deep-900/90 via-deep-900/50 to-transparent" />

          <div className="relative z-10 max-w-7xl mx-auto px-4 lg:px-6 pt-16 pb-12 md:pt-24 md:pb-16">
            <div className="eyebrow mb-3 text-slate-200">Pick Your Allegiance</div>
            <EtuTitle as="h1" text="One Galaxy at War." fit className="text-4xl md:text-6xl" />
            <p
              className="mt-5 max-w-2xl text-lg md:text-xl text-slate-100 leading-relaxed"
              style={{ textShadow: '0 2px 10px rgba(0,0,0,.9)' }}
            >
              Send an envoy, offer tribute, propose an alliance or declare war. Every faction
              remembers what you did, and sealing an alliance with one angers its enemies.
            </p>
            <p className="mt-4 text-base text-slate-200">
              <span className="font-mono text-emerald-300">{live.length} live</span> in the
              playtest, <span className="font-mono text-amber-300">{inDev.length} in development</span>.
              Total roster <span className="font-mono text-cyan-300">{all.length}</span>.
            </p>

            <div className="mt-7 flex flex-wrap gap-2" role="tablist" aria-label="Filter factions">
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
                      uppercase tracking-[0.18em] transition-all backdrop-blur
                      ${active
                        ? 'bg-cyan-500/20 border border-cyan-400/60 text-cyan-100'
                        : 'bg-deep-900/60 border border-white/15 text-slate-300 hover:bg-white/10 hover:text-white'
                      }
                    `}
                  >
                    {f.label}
                  </button>
                )
              })}
            </div>
          </div>
        </section>

        {/* Live factions — the ones you meet in the playtest */}
        {showLive && (
          <section className="max-w-7xl mx-auto px-4 lg:px-6 pt-12 pb-6">
            <div className="flex items-center gap-3 mb-6">
              <h2 className="font-display text-sm font-bold uppercase tracking-[0.22em] text-emerald-300">
                In the playtest now
              </h2>
              <div className="h-px flex-1 bg-gradient-to-r from-emerald-400/40 to-transparent" />
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {live.map((f, i) => {
                const { short, sub } = splitName(f.name)
                // The first card leads the page at full width.
                const lead = i === 0 && live.length % 2 === 1
                return (
                  <Link
                    key={f.id}
                    href={`/factions/${f.id}`}
                    className={`group relative block overflow-hidden rounded-2xl border bg-black transition-transform hover:-translate-y-0.5 ${
                      lead ? 'md:col-span-2' : ''
                    }`}
                    style={{ borderColor: f.color.primary + '55', boxShadow: `0 0 50px ${f.color.primary}1a` }}
                  >
                    <div className={`relative aspect-[4/5] sm:aspect-[16/10] ${lead ? 'md:aspect-[21/9]' : ''}`}>
                      <Image
                        src={f.cardImage ?? f.heroImage}
                        alt=""
                        fill
                        className="object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                        style={{ objectPosition: f.heroPosition ?? 'center' }}
                        sizes={lead ? '(max-width: 1280px) 100vw, 1232px' : '(max-width: 768px) 100vw, 620px'}
                        priority={i < 2}
                      />
                      <div
                        className="absolute inset-0"
                        style={{
                          background:
                            'linear-gradient(to top, rgba(4,6,20,0.97) 0%, rgba(4,6,20,0.88) 38%, rgba(4,6,20,0.4) 62%, rgba(4,6,20,0) 88%)',
                        }}
                      />

                      {f.emblem && (
                        <div
                          className="absolute top-4 right-4 w-14 h-14 md:w-20 md:h-20 rounded-xl overflow-hidden border bg-black"
                          style={{ borderColor: f.color.primary + '80' }}
                        >
                          <Image src={f.emblem.src} alt="" fill className="object-cover" sizes="80px" />
                        </div>
                      )}

                      <div className="absolute inset-x-0 bottom-0 p-5 md:p-7">
                        <div
                          className="font-display text-xs md:text-sm font-semibold uppercase tracking-[0.2em]"
                          style={{ color: f.color.accent }}
                        >
                          {sub}
                        </div>
                        <h3 className="mt-1 font-display text-3xl md:text-4xl font-bold text-white">
                          {short}
                        </h3>
                        <p className="mt-2 max-w-xl text-base md:text-lg text-slate-100 leading-snug">
                          {f.tagline}
                        </p>
                        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-300">
                          {f.leaders && f.leaders.length > 0 && (
                            <span>
                              <span className="text-slate-400">Led by</span>{' '}
                              {f.leaders.map(l => l.name).join(' and ')}
                            </span>
                          )}
                          {f.homePlanet && (
                            <span className="font-mono text-slate-400">{f.homePlanet}</span>
                          )}
                        </div>
                        <div className="mt-4 inline-flex items-center gap-2 font-display text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300 group-hover:text-cyan-200">
                          Open the dossier <span aria-hidden>→</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </section>
        )}

        {/* In development */}
        {showDev && (
          <section className="max-w-7xl mx-auto px-4 lg:px-6 pt-10 pb-8">
            <div className="flex items-center gap-3 mb-6">
              <h2 className="font-display text-sm font-bold uppercase tracking-[0.22em] text-amber-300">
                In development
              </h2>
              <div className="h-px flex-1 bg-gradient-to-r from-amber-400/40 to-transparent" />
              <span className="eyebrow">{inDev.length} peoples</span>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {inDev.map(f => {
                const { short, sub } = splitName(f.name)
                return (
                  <Link
                    key={f.id}
                    href={`/factions/${f.id}`}
                    className="etu-glass group relative overflow-hidden block transition-transform hover:-translate-y-0.5"
                    style={{ borderColor: f.color.primary + '40' }}
                  >
                    <div className="relative aspect-[4/3] overflow-hidden bg-black">
                      {f.emblem ? (
                        <Image
                          src={f.emblem.src}
                          alt=""
                          fill
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                          sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 320px"
                        />
                      ) : (
                        // No emblem yet: the faction's initial, struck in its own colour.
                        <div
                          className="absolute inset-0 flex items-center justify-center transition-transform duration-500 group-hover:scale-105"
                          style={{
                            background: `radial-gradient(circle at 50% 45%, ${f.color.primary}40 0%, ${f.color.secondary}14 45%, rgba(4,6,20,0) 75%)`,
                          }}
                          aria-hidden
                        >
                          <span
                            className="font-display text-8xl font-bold leading-none"
                            style={{
                              color: 'transparent',
                              WebkitTextStroke: `2px ${f.color.accent}`,
                              textShadow: `0 0 40px ${f.color.primary}`,
                            }}
                          >
                            {short.charAt(0)}
                          </span>
                        </div>
                      )}
                      <div
                        className="absolute inset-0"
                        style={{
                          background:
                            'linear-gradient(to top, rgba(4,6,20,0.9) 0%, rgba(4,6,20,0.2) 45%, rgba(4,6,20,0) 100%)',
                        }}
                      />
                      <span className="absolute top-3 right-3 etu-pill etu-pill--amber" style={{ background: 'rgba(4,6,20,0.7)' }}>
                        <span className="ping" /> Dev
                      </span>
                      <div
                        className="absolute inset-x-0 bottom-0 h-px"
                        style={{
                          background: `linear-gradient(90deg, transparent, ${f.color.primary}, transparent)`,
                          opacity: 0.7,
                        }}
                      />
                    </div>

                    <div className="p-5">
                      <h3 className="font-display text-lg font-bold text-white">{short}</h3>
                      {sub && (
                        <div
                          className="mt-0.5 font-display text-xs font-semibold uppercase tracking-[0.18em]"
                          style={{ color: f.color.accent }}
                        >
                          {sub}
                        </div>
                      )}
                      <p className="mt-2 text-sm text-slate-300 leading-snug line-clamp-3">{f.tagline}</p>
                      {(f.homeZone || f.homePlanet) && (
                        <div className="mt-3 text-xs font-mono text-slate-400 truncate">
                          {f.homeZone}
                          {f.homeZone && f.homePlanet ? ' · ' : ''}
                          {f.homePlanet}
                        </div>
                      )}
                    </div>
                  </Link>
                )
              })}
            </div>
          </section>
        )}

        {/* CTA */}
        <section className="max-w-4xl mx-auto px-4 lg:px-6 py-16 text-center">
          <h2 className="font-display text-3xl md:text-4xl font-bold etu-headline-grad text-balance">
            Meet them in the free playtest
          </h2>
          <p className="mt-4 text-lg text-slate-300">
            Wishlist on Steam and request playtest access from the store page.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center items-center">
            <WishlistButton placement="factions-index" className="btn-3d btn-3d-steam" />
            <Link href="/bosses" className="btn-ghost">
              See the bosses
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </>
  )
}
