import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import BossDossier from '@/components/bosses/BossDossier'
import { getAllBosses, getAllBossSlugs, getBoss } from '@/data/bosses'
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
    openGraph: { images: [{ url: boss.heroImage }] },
  }
}

export default function BossPage({ params }: { params: { slug: string } }) {
  const boss = getBoss(params.slug)
  if (!boss) notFound()

  const faction = boss.factionId ? getFaction(boss.factionId) : undefined
  const zone = getZoneForBoss(boss)
  const facts = [
    faction && { label: 'Faction', value: faction.name, href: `/factions/${faction.id}` },
    boss.homeZone && { label: 'Zone', value: boss.homeZone, href: zone ? `/zones/${zone.id}` : undefined },
    boss.homePlanet && { label: 'Home', value: boss.homePlanet },
  ].filter(Boolean) as { label: string; value: string; href?: string }[]

  const roster = getAllBosses()
  const at = roster.findIndex(b => b.id === boss.id)
  const prev = roster[(at - 1 + roster.length) % roster.length]
  const next = roster[(at + 1) % roster.length]

  return (
    <>
      <Header />

      <main className="min-h-screen bg-deep-900 text-slate-100">
        <BossDossier boss={boss} facts={facts} />

        {/* Roster: jump to any other boss */}
        <section className="py-14 border-t border-white/10">
          <div className="max-w-7xl mx-auto px-4 lg:px-6">
            <div className="grid grid-cols-2 gap-4 mb-10">
              {[
                { b: prev, dir: 'Previous', align: 'text-left', arrow: '←' },
                { b: next, dir: 'Next', align: 'text-right', arrow: '→' },
              ].map(({ b, dir, align, arrow }) => (
                <Link
                  key={dir}
                  href={`/bosses/${b.id}`}
                  className={`etu-glass group flex items-center gap-4 p-3 ${dir === 'Next' ? 'flex-row-reverse' : ''}`}
                  style={{ borderColor: b.color.primary + '40' }}
                >
                  <span className="relative w-16 h-16 shrink-0 overflow-hidden rounded-lg bg-[#070910]">
                    <Image src={b.heroImage} alt="" fill className="object-cover transition-transform group-hover:scale-110" sizes="64px" />
                  </span>
                  <span className={`min-w-0 flex-1 ${align}`}>
                    <span className="eyebrow block">
                      {dir === 'Previous' ? `${arrow} ${dir}` : `${dir} ${arrow}`}
                    </span>
                    <span className="block font-display text-sm font-bold uppercase tracking-[0.12em] truncate" style={{ color: b.color.accent }}>
                      {b.name}
                    </span>
                  </span>
                </Link>
              ))}
            </div>

            <nav aria-label="All bosses" className="flex flex-wrap justify-center gap-3">
              {roster.map(b => {
                const here = b.id === boss.id
                return (
                  <Link
                    key={b.id}
                    href={`/bosses/${b.id}`}
                    title={b.name}
                    aria-current={here ? 'page' : undefined}
                    className="relative w-14 h-14 overflow-hidden rounded-full border-2 bg-[#070910] transition-transform hover:scale-110"
                    style={{
                      borderColor: here ? b.color.primary : 'rgba(255,255,255,0.12)',
                      boxShadow: here ? `0 0 16px ${b.color.primary}` : 'none',
                    }}
                  >
                    <Image src={b.heroImage} alt={b.name} fill className="object-cover" sizes="56px" />
                  </Link>
                )
              })}
            </nav>

            <div className="mt-12 flex flex-col sm:flex-row gap-4 justify-center items-center">
              <a href={STEAM_URL} target="_blank" rel="noopener noreferrer" className="btn-3d btn-3d-steam px-6 py-3 text-sm">
                Wishlist on Steam
              </a>
              <Link href="/bosses" className="btn-ghost">
                All Bosses
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  )
}
