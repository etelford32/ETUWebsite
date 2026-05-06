"use client"

import { useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { getBoss } from '@/data/bosses'
import { getFaction } from '@/data/factions'
import { getZoneForBoss } from '@/data/zones'

export default function BossPage() {
  const params = useParams()
  const slug = params?.slug as string
  const boss = getBoss(slug)
  const faction = boss?.factionId ? getFaction(boss.factionId) : undefined
  const zone = boss ? getZoneForBoss(boss) : undefined

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

  if (!boss) {
    return (
      <>
        <Header />
        <main className="min-h-screen flex items-center justify-center bg-deep-900">
          <div className="text-center max-w-md px-4">
            <div className="eyebrow mb-3">404 · Off Map</div>
            <h1 className="font-display text-4xl font-bold etu-headline-grad mb-4">
              Boss Not Found
            </h1>
            <p className="text-slate-300 mb-8">
              No dossier matches that designation.
            </p>
            <Link href="/bosses" className="btn-ghost">
              Back to Bosses
            </Link>
          </div>
        </main>
        <Footer />
      </>
    )
  }

  return (
    <>
      <Header />

      <main className="min-h-screen bg-deep-900 text-slate-100">
        {/* Hero */}
        <section
          className="relative h-[60vh] min-h-[500px] flex items-end overflow-hidden"
          style={{
            background: `linear-gradient(135deg, ${boss.color.primary}22 0%, ${boss.color.secondary}11 100%)`,
          }}
        >
          <div className="absolute inset-0 opacity-40">
            <Image
              src={boss.heroImage}
              alt={boss.name}
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
                    borderColor: boss.color.primary + '66',
                    background: boss.color.primary + '14',
                    color: boss.color.accent,
                  }}
                >
                  {boss.tier} · Boss
                </span>
                {boss.status === 'in-development' && (
                  <span className="etu-pill etu-pill--amber">
                    <span className="ping" /> In Development
                  </span>
                )}
                <Link
                  href="/bosses"
                  className="eyebrow text-slate-400 hover:text-slate-200 transition-colors"
                  style={{ textShadow: '0 1px 6px rgba(0,0,0,.9)' }}
                >
                  ← All Bosses
                </Link>
              </div>
              <h1
                className="cinematic-title text-5xl md:text-7xl"
                style={{ textShadow: '0 4px 24px rgba(0,0,0,.7), 0 0 30px rgba(147,197,253,.35)' }}
              >
                {boss.name}
              </h1>
              <p className="mt-4 text-xl md:text-2xl text-slate-200 max-w-2xl">
                {boss.tagline}
              </p>
            </div>
          </div>
        </section>

        {/* Stats strip */}
        <section className="border-y border-white/10 bg-white/[0.02]">
          <div className="max-w-7xl mx-auto px-4 lg:px-6 py-6 grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <div className="eyebrow mb-1">Tier</div>
              <div className="font-mono tabular-nums text-lg text-cyan-300">{boss.tier}</div>
            </div>
            {boss.homeZone && (
              <div>
                <div className="eyebrow mb-1">Home Zone</div>
                {zone ? (
                  <Link
                    href={`/zones/${zone.id}`}
                    className="font-mono tabular-nums text-lg text-cyan-300 hover:text-cyan-200 hover:underline"
                  >
                    {boss.homeZone}
                  </Link>
                ) : (
                  <div className="font-mono tabular-nums text-lg text-cyan-300">{boss.homeZone}</div>
                )}
              </div>
            )}
            {boss.homePlanet && (
              <div>
                <div className="eyebrow mb-1">Home Planet</div>
                <div className="font-mono tabular-nums text-lg text-cyan-300">{boss.homePlanet}</div>
              </div>
            )}
            {boss.rewards ? (
              <div>
                <div className="eyebrow mb-1">Rewards</div>
                <div className="font-mono tabular-nums text-lg text-cyan-300">
                  {boss.rewards.experience.toLocaleString()} XP ·{' '}
                  {boss.rewards.credits.toLocaleString()} cr
                </div>
              </div>
            ) : (
              <div>
                <div className="eyebrow mb-1">Status</div>
                <div className="font-mono tabular-nums text-lg text-amber-300">
                  {boss.status === 'in-development' ? 'In Development' : 'Live'}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Description + Strategy */}
        <section className="py-16">
          <div className="max-w-7xl mx-auto px-4 lg:px-6 grid lg:grid-cols-2 gap-8 items-start">
            <div className="reveal">
              <div className="eyebrow mb-3">Threat Profile</div>
              <h2 className="font-display text-3xl font-bold mb-5 etu-headline-grad">
                What you&apos;re fighting
              </h2>
              <p className="text-lg text-slate-300 leading-relaxed mb-6">
                {boss.description}
              </p>
              {faction && (
                <Link
                  href={`/factions/${faction.id}`}
                  className="inline-flex items-center gap-2 text-cyan-300 hover:text-cyan-200 font-display text-sm font-semibold uppercase tracking-[0.14em] transition-colors"
                >
                  <span>Affiliated · {faction.name}</span>
                  <span aria-hidden>→</span>
                </Link>
              )}
            </div>

            <div className="reveal">
              <div className="eyebrow mb-3">Engagement</div>
              <h2 className="font-display text-3xl font-bold mb-5 etu-headline-grad">
                How to fight it
              </h2>
              <div
                className="etu-glass p-6"
                style={{
                  borderColor: boss.color.primary + '40',
                  background: boss.color.primary + '0E',
                }}
              >
                <div
                  className="eyebrow mb-2"
                  style={{ color: boss.color.accent }}
                >
                  Strategy
                </div>
                <p className="text-slate-200 leading-relaxed">{boss.strategy}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Abilities */}
        <section className="py-16 border-t border-white/10">
          <div className="max-w-7xl mx-auto px-4 lg:px-6">
            <div className="reveal mb-10">
              <div className="eyebrow mb-3">Loadout</div>
              <h2 className="font-display text-3xl md:text-4xl font-bold etu-headline-grad">
                Abilities
              </h2>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              {boss.abilities.map((a, idx) => (
                <div key={idx} className="reveal etu-glass flex items-start gap-4 p-5">
                  <div
                    className="font-mono tabular-nums w-10 h-10 rounded-md flex items-center justify-center shrink-0 font-bold"
                    style={{
                      background: boss.color.primary + '1A',
                      border: `1px solid ${boss.color.primary}55`,
                      color: boss.color.primary,
                    }}
                  >
                    {String(idx + 1).padStart(2, '0')}
                  </div>
                  <div className="text-slate-200 leading-relaxed">{a}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Lore */}
        <section className="py-16 border-t border-white/10">
          <div className="max-w-4xl mx-auto px-4 lg:px-6">
            <div className="reveal">
              <div className="eyebrow mb-3">Origin & Lore</div>
              <h2 className="font-display text-3xl md:text-4xl font-bold mb-6 etu-headline-grad">
                Where it came from
              </h2>
              <div
                className="etu-glass p-8 border-l-2"
                style={{
                  borderLeftColor: boss.color.primary,
                  background: boss.color.primary + '0A',
                }}
              >
                <p className="text-lg text-slate-200 leading-relaxed italic">
                  {boss.lore}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 border-t border-white/10">
          <div className="max-w-4xl mx-auto px-4 lg:px-6 text-center">
            <div className="reveal">
              <h2 className="font-display text-3xl md:text-4xl font-bold mb-4 etu-headline-grad">
                Ready to face {boss.name}?
              </h2>
              <p className="text-lg text-slate-300 mb-8">
                Drop into the Megabot Arena right now to test your reflexes, climb the
                leaderboard, then wishlist on Steam to face the full roster at beta.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <Link
                  href="/missile-game"
                  className="btn-3d btn-3d-red px-6 py-3 text-sm"
                >
                  ▶ Play Megabot Arena
                </Link>
                <a
                  href="https://store.steampowered.com/app/4094340/Explore_the_Universe_2175/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-3d btn-3d-steam px-6 py-3 text-sm"
                >
                  Wishlist on Steam
                </a>
                <Link href="/leaderboard?mode=megabot" className="btn-ghost">
                  🏆 Arena Leaderboard
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
