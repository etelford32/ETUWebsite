import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import ArtGallery from '@/components/ArtGallery'
import RevealObserver from '@/components/RevealObserver'
import WishlistButton from '@/components/WishlistButton'
import { getAllFactionSlugs, getFaction } from '@/data/factions'
import { getBossesForFaction } from '@/data/bosses'
import { getAllZones } from '@/data/zones'

export function generateStaticParams() {
  return getAllFactionSlugs().map(slug => ({ slug }))
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const faction = getFaction(params.slug)
  if (!faction) return {}
  const title = `${faction.name.replace(' • ', ', ')} | Explore the Universe 2175`
  const description = faction.description ?? faction.tagline
  const image = faction.cardImage ?? faction.heroImage
  return {
    title,
    description,
    openGraph: { title, description, images: [{ url: image }] },
    twitter: { card: 'summary_large_image', title, description, images: [image] },
  }
}

export default function FactionPage({ params }: { params: { slug: string } }) {
  const faction = getFaction(params.slug)
  if (!faction) notFound()

  const shortName = faction.name.split('•')[0].trim()
  const isStub = faction.status === 'in-development'
  const bosses = getBossesForFaction(faction.id)
  const homeZoneObj = (() => {
    if (!faction.homeZone) return undefined
    const haystack = faction.homeZone.toLowerCase()
    return getAllZones().find(z => z.aliases.some(a => haystack.includes(a)))
  })()
  const { primary, secondary, accent } = faction.color
  const leaders = faction.leaders ?? []
  const gallery = faction.gallery ?? []
  const units = faction.units ?? []
  const hasUnitArt = units.some(u => u.image)

  return (
    <>
      <Header />
      <RevealObserver />

      <main className="min-h-screen bg-deep-900 text-slate-100">
        {/* Hero */}
        <section
          className="relative min-h-[560px] md:min-h-[640px] flex items-end overflow-hidden"
          style={{ background: `linear-gradient(135deg, ${primary}22 0%, ${secondary}11 100%)` }}
        >
          <div className="absolute inset-0">
            <Image
              src={faction.heroImage}
              alt=""
              fill
              // Placeholder art on unfinished profiles sits further back.
              className={`object-cover ${faction.cardImage ? '' : 'opacity-45'}`}
              style={{ objectPosition: faction.heroPosition ?? 'center' }}
              priority
              sizes="100vw"
            />
            {/* Keeps the type legible without burying the painting. */}
            <div
              className="absolute inset-0"
              style={{
                background:
                  'linear-gradient(to top, rgba(4,6,20,1) 0%, rgba(4,6,20,0.82) 26%, rgba(4,6,20,0.3) 62%, rgba(4,6,20,0.25) 100%), linear-gradient(to right, rgba(4,6,20,0.7) 0%, rgba(4,6,20,0.15) 60%, rgba(4,6,20,0) 100%)',
              }}
            />
          </div>

          <div className="relative z-10 w-full max-w-7xl mx-auto px-4 lg:px-6 pt-28 pb-12">
            <div className="reveal flex items-end justify-between gap-8">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  <span
                    className="etu-pill"
                    style={{
                      borderColor: primary + '80',
                      background: 'rgba(4,6,20,0.65)',
                      color: accent,
                    }}
                  >
                    {faction.kind ?? 'Faction'}
                  </span>
                  {isStub ? (
                    <span className="etu-pill etu-pill--amber" style={{ background: 'rgba(4,6,20,0.65)' }}>
                      <span className="ping" /> Profile In Development
                    </span>
                  ) : (
                    <span className="etu-pill etu-pill--green" style={{ background: 'rgba(4,6,20,0.65)' }}>
                      In the playtest
                    </span>
                  )}
                  <Link
                    href="/factions"
                    className="eyebrow text-slate-300 hover:text-white transition-colors"
                    style={{ textShadow: '0 1px 6px rgba(0,0,0,.9)' }}
                  >
                    ← All Factions
                  </Link>
                </div>
                <h1
                  className="font-display text-5xl md:text-7xl font-bold tracking-tight text-white text-balance"
                  style={{ textShadow: '0 4px 24px rgba(0,0,0,.85)' }}
                >
                  {shortName}
                </h1>
                {faction.name.includes('•') && (
                  <p
                    className="mt-2 font-display text-lg md:text-2xl font-semibold uppercase tracking-[0.16em]"
                    style={{ color: accent, textShadow: '0 2px 10px rgba(0,0,0,.9)' }}
                  >
                    {faction.name.split('•').slice(1).join('•').trim()}
                  </p>
                )}
                <p
                  className="mt-4 text-xl md:text-2xl text-slate-100 max-w-2xl text-balance"
                  style={{ textShadow: '0 2px 10px rgba(0,0,0,.9)' }}
                >
                  {faction.tagline}
                </p>
                <div className="mt-7 flex flex-wrap gap-3">
                  <WishlistButton placement={`faction-hero-${faction.id}`} className="btn-3d btn-3d-steam" />
                  {faction.featurePage && (
                    <Link href={faction.featurePage.href} className="btn-ghost" style={{ background: 'rgba(4,6,20,0.6)' }}>
                      {faction.featurePage.label} <span aria-hidden>→</span>
                    </Link>
                  )}
                </div>
              </div>

              {faction.emblem && (
                <div
                  className="hidden lg:block relative w-52 h-52 xl:w-60 xl:h-60 shrink-0 rounded-2xl overflow-hidden border bg-black"
                  style={{ borderColor: primary + '66', boxShadow: `0 0 60px ${primary}40` }}
                >
                  <Image
                    src={faction.emblem.src}
                    alt={faction.emblem.alt}
                    fill
                    className="object-cover"
                    sizes="240px"
                  />
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Home zone / planet strip */}
        {(faction.homeZone || faction.homePlanet) && (
          <section className="border-y border-white/10 bg-white/[0.02]">
            <div className="max-w-7xl mx-auto px-4 lg:px-6 py-6 grid grid-cols-2 md:grid-cols-4 gap-6">
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
              {leaders.length > 0 && (
                <div>
                  <div className="eyebrow mb-1">{leaders.length === 1 ? 'Leader' : 'Leaders'}</div>
                  <div className="font-mono text-lg text-cyan-300">
                    {leaders.map(l => l.name).join(' · ')}
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
              <div
                className={`grid gap-8 items-start ${
                  faction.abilities && faction.abilities.length > 0 ? 'lg:grid-cols-2' : 'max-w-3xl'
                }`}
              >
                {(faction.description || faction.playstyle) && (
                  <div className="reveal">
                    <div className="eyebrow mb-3">Overview</div>
                    <h2 className="font-display text-3xl font-bold mb-5 etu-headline-grad">
                      Who they are
                    </h2>
                    {faction.description && (
                      <p className="text-lg text-slate-200 leading-relaxed mb-6">
                        {faction.description}
                      </p>
                    )}
                    {faction.playstyle && (
                      <div
                        className="etu-glass p-6"
                        style={{ borderColor: primary + '40', background: primary + '0E' }}
                      >
                        <div className="eyebrow mb-2" style={{ color: accent }}>
                          {faction.playstyleLabel ?? 'How they fight'}
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
                      {faction.abilitiesLabel ?? 'What they bring'}
                    </h2>
                    <div className="space-y-3">
                      {faction.abilities.map((ability, idx) => (
                        <div key={idx} className="etu-glass flex items-center gap-3 p-4">
                          <div
                            className="font-mono tabular-nums w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-sm font-bold"
                            style={{
                              background: primary + '24',
                              color: accent,
                              border: `1px solid ${primary}55`,
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

        {/* Leaders */}
        {leaders.length > 0 && (
          <section className="py-16 border-t border-white/10">
            <div className="max-w-7xl mx-auto px-4 lg:px-6">
              <div className="reveal mb-8">
                <div className="eyebrow mb-3">Command</div>
                <h2 className="font-display text-3xl md:text-4xl font-bold etu-headline-grad">
                  Who speaks for them
                </h2>
              </div>
              <div className={`grid gap-5 ${leaders.length > 1 ? 'md:grid-cols-2' : ''}`}>
                {leaders.map(leader => (
                  <article
                    key={leader.name}
                    className="reveal etu-glass p-7"
                    style={{ borderColor: primary + '40', background: primary + '0A' }}
                  >
                    <div className="eyebrow mb-2" style={{ color: accent }}>
                      {leader.title}
                    </div>
                    <h3 className="font-display text-2xl font-bold text-white">{leader.name}</h3>
                    <p className="mt-3 text-slate-200 leading-relaxed">{leader.description}</p>
                    {leader.quote && (
                      <p className="mt-4 text-lg italic leading-relaxed" style={{ color: accent }}>
                        &ldquo;{leader.quote}&rdquo;
                      </p>
                    )}
                    {leader.href && (
                      <Link
                        href={leader.href}
                        className="mt-5 inline-flex items-center gap-2 font-display text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300 hover:text-cyan-200"
                      >
                        {leader.hrefLabel ?? 'Read the dossier'} <span aria-hidden>→</span>
                      </Link>
                    )}
                  </article>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Key art */}
        {gallery.length > 0 && (
          <section className="py-16 border-t border-white/10">
            <div className="max-w-7xl mx-auto px-4 lg:px-6">
              <div className="reveal mb-10">
                <div className="eyebrow mb-3">Key Art</div>
                <h2 className="font-display text-3xl md:text-4xl font-bold etu-headline-grad">
                  {shortName} in the frame
                </h2>
                <p className="text-slate-300 mt-2">Select any piece to see it full size.</p>
              </div>
              <ArtGallery pieces={gallery} accent={primary} />
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
                        style={{ background: primary + '24' }}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: accent }}>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <h2 className="font-display text-xl font-bold uppercase tracking-[0.14em]">
                        Strengths
                      </h2>
                    </div>
                    <ul className="space-y-3">
                      {faction.strengths.map((s, i) => (
                        <li key={i} className="flex items-start gap-3 text-slate-200">
                          <span className="text-lg mt-0.5" style={{ color: primary }}>
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
                        <svg className="w-5 h-5 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
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
                <p className="text-slate-300 mt-2">
                  <span className="font-mono text-cyan-300">{bosses.length}</span>{' '}
                  boss{bosses.length === 1 ? '' : 'es'} flying this faction&apos;s flag. In-game
                  screenshots.
                </p>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {bosses.map(boss => (
                  <Link
                    key={boss.id}
                    href={`/bosses/${boss.id}`}
                    className="etu-glass overflow-hidden group transition-transform hover:-translate-y-0.5"
                    style={{ borderColor: boss.color.primary + '40' }}
                  >
                    <div className="relative aspect-[16/10] bg-black">
                      <Image
                        src={boss.heroImage}
                        alt={boss.screenshots[0]?.alt ?? boss.name}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 400px"
                      />
                    </div>
                    <div className="p-5">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div
                          className="font-display text-sm font-bold uppercase tracking-[0.14em]"
                          style={{ color: boss.color.accent }}
                        >
                          {boss.name}
                        </div>
                        <span
                          className="etu-pill text-[9px] shrink-0"
                          style={{
                            borderColor: boss.color.primary + '66',
                            background: boss.color.primary + '14',
                            color: boss.color.accent,
                          }}
                        >
                          {boss.tier ?? 'Boss'}
                        </span>
                      </div>
                      <p className="text-sm text-slate-300 leading-snug">{boss.tagline}</p>
                      {boss.quote && (
                        <p className="mt-3 text-sm italic text-slate-400">&ldquo;{boss.quote}&rdquo;</p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Units */}
        {units.length > 0 && (
          <section className="py-16 border-t border-white/10">
            <div className="max-w-7xl mx-auto px-4 lg:px-6">
              <div className="reveal mb-10">
                <div className="eyebrow mb-3">Roster</div>
                <h2 className="font-display text-3xl md:text-4xl font-bold etu-headline-grad">
                  Who you will meet
                </h2>
                <p className="text-slate-300 mt-2">
                  <span className="font-mono text-cyan-300">{units.length}</span> you will run
                  into out there.
                </p>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {units.map((unit, idx) => (
                  <div key={idx} className="reveal etu-glass overflow-hidden flex flex-col">
                    {unit.image ? (
                      <div className="relative aspect-[16/9] bg-black/60 border-b border-white/5">
                        <Image
                          src={unit.image}
                          alt={`${unit.name}, as the game draws it`}
                          fill
                          className="object-contain p-3"
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 400px"
                        />
                      </div>
                    ) : (
                      hasUnitArt && (
                        <div
                          className="aspect-[16/9] border-b border-white/5 flex items-center justify-center font-mono text-3xl font-bold"
                          style={{ background: primary + '0D', color: primary + '66' }}
                          aria-hidden
                        >
                          {String(idx + 1).padStart(2, '0')}
                        </div>
                      )
                    )}
                    <div className="p-6 flex-1 flex flex-col">
                      {!hasUnitArt && (
                        <div
                          className="w-11 h-11 rounded-md flex items-center justify-center mb-4 font-mono tabular-nums font-bold"
                          style={{
                            background: primary + '1A',
                            border: `1px solid ${primary}55`,
                            color: primary,
                          }}
                        >
                          {String(idx + 1).padStart(2, '0')}
                        </div>
                      )}
                      <h3 className="font-display font-semibold text-lg mb-1">{unit.name}</h3>
                      {(unit.role || unit.weightClass) && (
                        <div className="flex flex-wrap items-center gap-2 mb-3">
                          {unit.weightClass && (
                            <span
                              className="etu-pill"
                              style={{
                                borderColor: primary + '66',
                                background: primary + '14',
                                color: accent,
                              }}
                            >
                              {unit.weightClass}
                            </span>
                          )}
                          {unit.role && <span className="text-sm text-slate-400">{unit.role}</span>}
                        </div>
                      )}
                      <p className="text-sm text-slate-300 leading-relaxed">{unit.description}</p>
                      {unit.quote && (
                        <p className="mt-auto pt-4 text-sm italic" style={{ color: accent }}>
                          &ldquo;{unit.quote}&rdquo;
                        </p>
                      )}
                    </div>
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
                  style={{ borderLeftColor: primary, background: primary + '0A' }}
                >
                  <p className="text-lg text-slate-200 leading-relaxed">{faction.lore}</p>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* CTA */}
        <section className="py-20 border-t border-white/10">
          <div className="max-w-4xl mx-auto px-4 lg:px-6 text-center">
            <div className="reveal">
              <h2 className="font-display text-3xl md:text-4xl font-bold mb-4 etu-headline-grad text-balance">
                {faction.ctaTitle ?? `Meet the ${shortName} in the playtest`}
              </h2>
              <p className="text-lg text-slate-300 mb-8">
                Wishlist on Steam and request access to the free playtest from the store page.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <WishlistButton placement={`faction-cta-${faction.id}`} className="btn-3d btn-3d-steam" />
                {faction.featurePage && (
                  <Link href={faction.featurePage.href} className="btn-ghost">
                    {faction.featurePage.label}
                  </Link>
                )}
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
