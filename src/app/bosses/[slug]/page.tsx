import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { getAllBossSlugs, getBoss } from '@/data/bosses'
import { getFaction } from '@/data/factions'
import { getZoneForBoss } from '@/data/zones'

const STEAM_URL = 'https://store.steampowered.com/app/4094340/Explore_the_Universe_2175/'

export function generateStaticParams() {
  return getAllBossSlugs().map(slug => ({ slug }))
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const boss = getBoss(params.slug)
  if (!boss) return {}
  return {
    title: `${boss.name} | Explore the Universe 2175`,
    description: boss.tagline,
  }
}

export default function BossPage({ params }: { params: { slug: string } }) {
  const boss = getBoss(params.slug)
  if (!boss) notFound()

  const faction = boss.factionId ? getFaction(boss.factionId) : undefined
  const zone = getZoneForBoss(boss)

  const facts = [
    boss.tier && { label: 'Rarity', value: boss.tier },
    faction && { label: 'Faction', value: faction.name, href: `/factions/${faction.id}` },
    boss.homeZone && { label: 'Zone', value: boss.homeZone, href: zone ? `/zones/${zone.id}` : undefined },
    boss.homePlanet && { label: 'Home', value: boss.homePlanet },
  ].filter(Boolean) as { label: string; value: string; href?: string }[]

  return (
    <>
      <Header />

      <main className="min-h-screen bg-deep-900 text-slate-100">
        {/* Hero */}
        <section className="max-w-7xl mx-auto px-4 lg:px-6 pt-10 pb-12 grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <div>
              <Link href="/bosses" className="eyebrow text-slate-400 hover:text-slate-200 transition-colors">
                ← All Bosses
              </Link>
            </div>
            <h1 className="cinematic-title text-5xl md:text-7xl mt-4">{boss.name}</h1>
            <p className="mt-4 text-xl text-slate-300 max-w-xl">{boss.tagline}</p>
            {boss.featurePage && (
              <div className="mt-6">
                <Link href={boss.featurePage.href} className="btn-ghost">
                  {boss.featurePage.label} <span aria-hidden>→</span>
                </Link>
              </div>
            )}
          </div>
          <div
            className="relative aspect-square w-full max-w-xl mx-auto overflow-hidden rounded-xl border bg-[#070910]"
            style={{ borderColor: boss.color.primary + '55' }}
          >
            <Image
              src={boss.heroImage}
              alt={boss.name}
              fill
              priority
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 576px"
            />
          </div>
        </section>

        {/* Facts */}
        {facts.length > 0 && (
          <section className="border-y border-white/10 bg-white/[0.02]">
            <div className="max-w-7xl mx-auto px-4 lg:px-6 py-6 grid grid-cols-2 md:grid-cols-4 gap-6">
              {facts.map(f => (
                <div key={f.label}>
                  <div className="eyebrow mb-1">{f.label}</div>
                  {f.href ? (
                    <Link href={f.href} className="font-mono text-lg text-cyan-300 hover:text-cyan-200 hover:underline">
                      {f.value}
                    </Link>
                  ) : (
                    <div className="font-mono text-lg text-cyan-300">{f.value}</div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Abilities */}
        <section className="py-14">
          <div className="max-w-7xl mx-auto px-4 lg:px-6">
            <h2 className="font-display text-3xl font-bold etu-headline-grad mb-8">Abilities</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {boss.abilities.map(a => (
                <div
                  key={a.name}
                  className="etu-glass p-5 border-l-2"
                  style={{ borderLeftColor: boss.color.primary }}
                >
                  <div
                    className="font-display text-sm font-bold uppercase tracking-[0.14em] mb-1"
                    style={{ color: boss.color.accent }}
                  >
                    {a.name}
                  </div>
                  <div className="text-slate-300">{a.text}</div>
                </div>
              ))}
            </div>
            {boss.quote && (
              <blockquote
                className="mt-10 text-2xl md:text-3xl font-display text-slate-100 italic"
                style={{ color: boss.color.accent }}
              >
                &ldquo;{boss.quote}&rdquo;
              </blockquote>
            )}
          </div>
        </section>

        {/* Screenshots */}
        {boss.screenshots.length > 1 && (
          <section className="py-14 border-t border-white/10">
            <div className="max-w-7xl mx-auto px-4 lg:px-6">
              <h2 className="font-display text-3xl font-bold etu-headline-grad mb-8">In Game</h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {boss.screenshots.map(s => (
                  <a
                    key={s.src}
                    href={s.src}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="relative block aspect-square overflow-hidden rounded-lg border border-white/10 bg-[#070910]"
                  >
                    <Image
                      src={s.src}
                      alt={s.alt}
                      fill
                      className="object-cover transition-transform duration-500 hover:scale-105"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 400px"
                    />
                  </a>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* CTA */}
        <section className="py-16 border-t border-white/10">
          <div className="max-w-4xl mx-auto px-4 lg:px-6 flex flex-col sm:flex-row gap-4 justify-center items-center">
            <a
              href={STEAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-3d btn-3d-steam px-6 py-3 text-sm"
            >
              Wishlist on Steam
            </a>
            <Link href="/bosses" className="btn-ghost">
              All Bosses
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </>
  )
}
