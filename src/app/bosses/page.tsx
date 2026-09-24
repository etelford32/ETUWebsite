import Link from 'next/link'
import Image from 'next/image'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { getAllBosses } from '@/data/bosses'
import { getFaction } from '@/data/factions'

export default function BossesIndexPage() {
  const all = getAllBosses()

  return (
    <>
      <Header />

      <main className="min-h-screen bg-deep-900 text-slate-100">
        <section className="max-w-7xl mx-auto px-4 lg:px-6 pt-16 pb-10">
          <div className="eyebrow mb-3">Adversaries</div>
          <h1 className="font-display text-4xl md:text-6xl font-bold etu-headline-grad tracking-tight">
            Bosses
          </h1>
          <p className="mt-4 text-lg text-slate-300">
            <span className="font-mono text-cyan-300">{all.length}</span> in the game.
          </p>
        </section>

        <section className="max-w-7xl mx-auto px-4 lg:px-6 pb-24">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {all.map(b => {
              const faction = b.factionId ? getFaction(b.factionId) : undefined
              return (
                <Link
                  key={b.id}
                  href={`/bosses/${b.id}`}
                  className="etu-glass group relative overflow-hidden block transition-transform hover:-translate-y-0.5"
                  style={{ borderColor: b.color.primary + '40' }}
                >
                  <div className="relative aspect-square overflow-hidden bg-[#070910]">
                    <Image
                      src={b.heroImage}
                      alt={b.name}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 420px"
                    />
                    <div
                      className="absolute inset-x-0 bottom-0 h-1/3"
                      style={{ background: 'linear-gradient(to top, rgba(2,6,23,0.9), transparent)' }}
                    />
                    {b.tier && (
                      <span
                        className="etu-pill absolute top-3 right-3"
                        style={{
                          borderColor: b.color.primary + '66',
                          background: b.color.primary + '24',
                          color: b.color.accent,
                        }}
                      >
                        {b.tier}
                      </span>
                    )}
                  </div>

                  <div className="p-5">
                    <div
                      className="font-display text-sm font-bold uppercase tracking-[0.14em] mb-2"
                      style={{ color: b.color.accent }}
                    >
                      {b.name}
                    </div>
                    <p className="text-sm text-slate-300 leading-snug">{b.tagline}</p>
                    {(faction || b.homePlanet) && (
                      <div className="mt-3 text-xs font-mono text-slate-500 truncate">
                        {faction?.name}
                        {faction && b.homePlanet ? ' · ' : ''}
                        {b.homePlanet}
                      </div>
                    )}
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
