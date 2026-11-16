import Image from 'next/image'
import Link from 'next/link'
import DemoSignupButton from '@/components/DemoSignupButton'
import type { Boss } from '@/data/bosses'

const STEAM_URL = 'https://store.steampowered.com/app/4094340/Explore_the_Universe_2175/'

export interface Fact {
  label: string
  value: string
  href?: string
}

interface Props {
  boss: Boss
  facts: Fact[]
}

/** Who the boss is and what it looks like. Nothing about the fight. */
export default function BossDossier({ boss, facts }: Props) {
  const { color } = boss

  return (
    <>
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: `radial-gradient(900px 500px at 75% 30%, ${color.primary}22, transparent 65%)` }}
        />
        <div className="relative max-w-7xl mx-auto px-4 lg:px-6 pt-10 pb-14 grid lg:grid-cols-[1fr_1.05fr] gap-10 items-center">
          <div>
            <Link href="/bosses" className="eyebrow text-slate-400 hover:text-slate-200 transition-colors">
              ← All Bosses
            </Link>
            <div className="mt-4 flex flex-wrap gap-2">
              {boss.tier && (
                <span
                  className="etu-pill"
                  style={{ borderColor: color.primary + '66', background: color.primary + '1A', color: color.accent }}
                >
                  {boss.tier}
                </span>
              )}
              {facts.map(f =>
                f.href ? (
                  <Link key={f.label} href={f.href} className="etu-pill etu-pill--cyan hover:brightness-125">
                    {f.value}
                  </Link>
                ) : (
                  <span key={f.label} className="etu-pill text-slate-300 border-white/15">
                    {f.value}
                  </span>
                )
              )}
            </div>
            <h1 className="cinematic-title text-5xl md:text-7xl mt-5">{boss.name}</h1>
            <p className="mt-4 text-2xl text-slate-200 max-w-xl">{boss.tagline}</p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <DemoSignupButton placement="boss-dossier" className="btn-3d btn-3d-demo px-6 py-3 text-sm" />
              <a href={STEAM_URL} target="_blank" rel="noopener noreferrer" className="btn-3d btn-3d-steam px-6 py-3 text-sm">
                Wishlist on Steam
              </a>
              {boss.featurePage && (
                <Link href={boss.featurePage.href} className="btn-ghost">
                  {boss.featurePage.label} <span aria-hidden>→</span>
                </Link>
              )}
            </div>
          </div>

          <div
            className="relative w-full max-w-xl mx-auto lg:mx-0 lg:ml-auto aspect-square overflow-hidden rounded-2xl border bg-[#070910]"
            style={{ borderColor: color.primary + '55', boxShadow: `0 0 80px ${color.primary}26` }}
          >
            <Image
              src={boss.image.src}
              alt={boss.image.alt}
              fill
              priority
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 560px"
            />
          </div>
        </div>
      </section>

      {boss.quote && (
        <section className="py-14 border-t border-white/10">
          <blockquote
            className="max-w-4xl mx-auto px-4 lg:px-6 text-2xl md:text-3xl font-display italic text-center"
            style={{ color: color.accent }}
          >
            &ldquo;{boss.quote}&rdquo;
          </blockquote>
        </section>
      )}
    </>
  )
}
