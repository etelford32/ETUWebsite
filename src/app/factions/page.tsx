import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import WishlistButton from '@/components/WishlistButton'
import EtuTitle from '@/components/EtuTitle'
import FactionSelect, { type FactionSelectItem } from '@/components/factions/FactionSelect'
import { getAllFactions, type Faction } from '@/data/factions'
import { getBossesForFaction } from '@/data/bosses'

export const metadata: Metadata = {
  title: 'Factions | Explore the Universe 2175',
  description:
    'Every faction in Explore the Universe 2175 on one screen, laid out like the game’s faction select: leaders, homeworlds, strengths and key art for the five peoples in the playtest and the rest of the roster.',
  alternates: { canonical: '/factions' },
  openGraph: {
    title: 'Choose Your Faction | Explore the Universe 2175',
    description: 'One galaxy at war. Meet every faction, its leaders and its homeworld.',
    images: ['/art/crystal-consortium-royal-family-scene.jpg'],
  },
}

// The order the war introduces them: the enemy, then the peoples caught in it.
const LIVE_ORDER = ['megabot', 'mycelari', 'space-dwarves', 'wild', 'lumari']
// In-development factions with key art of their own lead their section.
const isLive = (f: Faction) => (f.status ?? 'live') === 'live'

function splitName(name: string) {
  const [short, ...rest] = name.split('•')
  return { short: short.trim(), sub: rest.join('•').trim() }
}

function ordered(all: Faction[]): Faction[] {
  const live = all
    .filter(isLive)
    .sort((a, b) => {
      const ai = LIVE_ORDER.indexOf(a.id)
      const bi = LIVE_ORDER.indexOf(b.id)
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi) || a.name.localeCompare(b.name)
    })
  const dev = all
    .filter(f => !isLive(f))
    .sort((a, b) => Number(!a.cardImage) - Number(!b.cardImage) || a.name.localeCompare(b.name))
  return [...live, ...dev]
}

function toItem(f: Faction): FactionSelectItem {
  const { short, sub } = splitName(f.name)
  return {
    id: f.id,
    short,
    sub,
    tagline: f.tagline,
    live: isLive(f),
    kind: f.kind ?? 'Faction',
    art: f.cardImage ?? f.heroImage,
    artIsPlaceholder: !f.cardImage,
    artPosition: f.heroPosition ?? 'center',
    emblem: f.emblem,
    homeZone: f.homeZone,
    homePlanet: f.homePlanet,
    color: f.color,
    leaders: (f.leaders ?? []).map(l => ({ name: l.name, title: l.title })),
    description: f.description,
    highlights: f.strengths ?? f.abilities ?? [],
    featurePage: f.featurePage,
    bossCount: getBossesForFaction(f.id).length,
  }
}

// Long-form pages that live outside /factions/[slug].
const DOSSIERS = [
  { href: '/evil-robots', title: 'Evil Robots', subtitle: 'The Machine Empire dossier', accent: '#ef4444', image: '/art/megabot-evil-eye.jpg' },
  { href: '/megabot', title: 'MEGABOT', subtitle: 'Enemy of the Universe', accent: '#f97316', image: '/art/megabot-crimson-eye.jpg' },
  { href: '/cyl', title: 'Cyl', subtitle: 'The last of the Lumari, your companion', accent: '#e879f9', image: '/art/cyl-corrupted-goddess-scene.jpg' },
  { href: '/bosses', title: 'Bosses', subtitle: 'Every faction’s champions', accent: '#22d3ee', image: '/art/xj9-second-in-command-scene.jpg' },
] as const

export default function FactionsIndexPage() {
  const all = ordered(getAllFactions())
  const items = all.map(toItem)
  const liveCount = items.filter(i => i.live).length

  return (
    <>
      <Header />

      <main className="min-h-screen bg-deep-900 text-slate-100">
        {/* Hero + the select console */}
        <section className="relative overflow-hidden">
          <Image
            src="/art/crystal-consortium-royal-family-scene.jpg"
            alt=""
            fill
            priority
            className="object-cover object-[50%_20%] opacity-40"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-deep-900/50 via-deep-900/85 to-deep-900" />

          <div className="relative z-10 max-w-7xl mx-auto px-4 lg:px-6 pt-12 pb-12 md:pt-16">
            <div className="max-w-3xl">
              <div className="eyebrow mb-3 text-slate-200">Pick your allegiance</div>
              <EtuTitle as="h1" text="One Galaxy at War." fit preload className="text-4xl md:text-6xl" />
              <p
                className="mt-4 text-lg md:text-xl text-slate-100 leading-relaxed"
                style={{ textShadow: '0 2px 10px rgba(0,0,0,.9)' }}
              >
                This is the screen you see before a Strategy run. Send an envoy, offer tribute,
                propose an alliance or declare war. Every faction remembers what you did, and an
                alliance with one angers its enemies.
              </p>
              <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-base text-slate-200">
                <span><span className="font-mono text-emerald-300">{liveCount}</span> in the playtest</span>
                <span><span className="font-mono text-amber-300">{items.length - liveCount}</span> in development</span>
                <span><span className="font-mono text-cyan-300">{items.length}</span> on the roster</span>
              </p>
            </div>

            <div className="mt-8">
              <FactionSelect factions={items} />
            </div>
          </div>
        </section>

        {/* Roster at a glance */}
        <section className="max-w-7xl mx-auto px-4 lg:px-6 py-14">
          <div className="flex items-center gap-3 mb-6">
            <h2 className="font-display text-sm font-bold uppercase tracking-[0.22em] text-cyan-300">
              The roster at a glance
            </h2>
            <div className="h-px flex-1 bg-gradient-to-r from-cyan-400/40 to-transparent" />
          </div>

          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-white/[0.03] text-left font-display text-[11px] uppercase tracking-[0.16em] text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-semibold">Faction</th>
                  <th className="px-4 py-3 font-semibold">Led by</th>
                  <th className="px-4 py-3 font-semibold">Zone</th>
                  <th className="px-4 py-3 font-semibold">Homeworld</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {items.map(f => (
                  <tr key={f.id} className="hover:bg-white/[0.03] transition-colors">
                    <td className="px-4 py-2.5">
                      <Link href={`/factions/${f.id}`} className="flex items-center gap-3 group">
                        <span
                          className="relative w-8 h-8 shrink-0 rounded-md overflow-hidden border bg-black flex items-center justify-center font-display font-bold text-sm"
                          style={{ borderColor: f.color.primary + '80', color: f.color.accent }}
                        >
                          {f.emblem ? (
                            <Image src={f.emblem.src} alt="" fill sizes="32px" className="object-cover" />
                          ) : (
                            f.short.charAt(0)
                          )}
                        </span>
                        <span className="min-w-0">
                          <span className="block font-semibold text-slate-100 group-hover:text-cyan-200">{f.short}</span>
                          <span className="block text-xs text-slate-500">{f.sub}</span>
                        </span>
                      </Link>
                    </td>
                    <td className="px-4 py-2.5 text-slate-300">
                      {f.leaders.length ? f.leaders.map(l => l.name).join(', ') : <span className="text-slate-600">—</span>}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-[13px] text-slate-400">{f.homeZone ?? '—'}</td>
                    <td className="px-4 py-2.5 font-mono text-[13px] text-slate-400">{f.homePlanet ?? '—'}</td>
                    <td className="px-4 py-2.5">
                      {f.live ? (
                        <span className="etu-pill etu-pill--green !text-[10px] !py-0.5">Playtest</span>
                      ) : (
                        <span className="etu-pill etu-pill--amber !text-[10px] !py-0.5">In dev</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Long-form dossiers */}
        <section className="max-w-7xl mx-auto px-4 lg:px-6 pb-14">
          <div className="flex items-center gap-3 mb-6">
            <h2 className="font-display text-sm font-bold uppercase tracking-[0.22em] text-rose-300">
              Long-form dossiers
            </h2>
            <div className="h-px flex-1 bg-gradient-to-r from-rose-400/40 to-transparent" />
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {DOSSIERS.map(d => (
              <Link
                key={d.href}
                href={d.href}
                className="group relative block overflow-hidden rounded-xl border bg-black aspect-[16/10]"
                style={{ borderColor: d.accent + '55' }}
              >
                <Image
                  src={d.image}
                  alt=""
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 300px"
                  className="object-cover opacity-80 transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-deep-900 via-deep-900/50 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-4">
                  <div className="font-display text-lg font-bold text-white">{d.title}</div>
                  <div className="text-xs text-slate-300">{d.subtitle}</div>
                  <div className="mt-1 font-display text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: d.accent }}>
                    Read →
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="max-w-4xl mx-auto px-4 lg:px-6 pb-16 pt-4 text-center">
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
