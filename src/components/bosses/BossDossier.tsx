"use client"

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { AnimatePresence, motion } from 'framer-motion'
import { Expand } from 'lucide-react'
import type { Boss } from '@/data/bosses'
import Lightbox from './Lightbox'
import BossPhases from './BossPhases'

interface Fact {
  label: string
  value: string
  href?: string
}

interface Props {
  boss: Boss
  facts: Fact[]
}

export default function BossDossier({ boss, facts }: Props) {
  const [shot, setShot] = useState(0)
  const [zoom, setZoom] = useState<number | null>(null)
  const [ability, setAbility] = useState(0)
  const { color, screenshots } = boss
  const picked = boss.abilities[ability]
  const pickedShot = picked.shot !== undefined ? screenshots[picked.shot] : undefined

  return (
    <>
      {/* ------------------------------------------------------------ hero */}
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
            <p className="mt-4 text-xl text-slate-300 max-w-xl">{boss.tagline}</p>
            {boss.encounter && <p className="mt-3 text-slate-400 max-w-xl">{boss.encounter}</p>}

            <dl className="mt-8 flex flex-wrap gap-x-8 gap-y-4">
              {boss.stats.map(s => (
                <div key={s.label}>
                  <dt className="eyebrow mb-1">{s.label}</dt>
                  <dd className="font-mono text-xl" style={{ color: color.accent }}>
                    {s.value}
                  </dd>
                </div>
              ))}
            </dl>

            {boss.featurePage && (
              <div className="mt-8">
                <Link href={boss.featurePage.href} className="btn-ghost">
                  {boss.featurePage.label} <span aria-hidden>→</span>
                </Link>
              </div>
            )}
          </div>

          {/* Screenshot viewer */}
          <div className="w-full max-w-xl mx-auto lg:mx-0 lg:ml-auto">
            <button
              type="button"
              onClick={() => setZoom(shot)}
              aria-label={`Enlarge: ${screenshots[shot].alt}`}
              className="group relative block w-full aspect-square overflow-hidden rounded-2xl border bg-[#070910]"
              style={{ borderColor: color.primary + '55', boxShadow: `0 0 60px ${color.primary}22` }}
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={screenshots[shot].src}
                  className="absolute inset-0"
                  initial={{ opacity: 0, scale: 1.03 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25 }}
                >
                  <Image
                    src={screenshots[shot].src}
                    alt={screenshots[shot].alt}
                    fill
                    priority={shot === 0}
                    className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                    sizes="(max-width: 1024px) 100vw, 576px"
                  />
                </motion.div>
              </AnimatePresence>
              <span className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-full bg-black/60 border border-white/15 px-3 py-1 text-xs text-slate-200 opacity-0 group-hover:opacity-100 transition-opacity">
                <Expand size={13} /> Enlarge
              </span>
            </button>

            {screenshots.length > 1 && (
              <div className="mt-3 grid grid-cols-4 gap-2" role="tablist" aria-label="Screenshots">
                {screenshots.map((s, i) => (
                  <button
                    key={s.src}
                    type="button"
                    role="tab"
                    aria-selected={i === shot}
                    aria-label={s.alt}
                    onClick={() => setShot(i)}
                    className="relative aspect-square overflow-hidden rounded-lg border-2 bg-[#070910] transition-all"
                    style={{
                      borderColor: i === shot ? color.primary : 'rgba(255,255,255,0.08)',
                      opacity: i === shot ? 1 : 0.6,
                    }}
                  >
                    <Image src={s.src} alt="" fill className="object-cover" sizes="120px" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------- abilities */}
      <section className="py-16 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 lg:px-6">
          <div className="flex items-end justify-between gap-4 mb-8">
            <h2 className="font-display text-3xl font-bold etu-headline-grad">Abilities</h2>
            <span className="text-xs font-mono text-slate-500 hidden sm:block">Select one</span>
          </div>
          <div className="grid lg:grid-cols-[1fr_1.1fr] gap-6 items-start">
            <div className="flex flex-col gap-2" role="tablist" aria-label="Abilities">
              {boss.abilities.map((a, i) => {
                const on = i === ability
                return (
                  <button
                    key={a.name}
                    type="button"
                    role="tab"
                    aria-selected={on}
                    onClick={() => setAbility(i)}
                    className="flex items-center gap-4 rounded-xl border px-4 py-3 text-left transition-all"
                    style={{
                      borderColor: on ? color.primary : 'rgba(255,255,255,0.08)',
                      background: on ? color.primary + '16' : 'rgba(255,255,255,0.02)',
                    }}
                  >
                    <span
                      className="font-mono text-sm w-8 h-8 rounded-md flex items-center justify-center shrink-0"
                      style={{
                        background: on ? color.primary : color.primary + '14',
                        color: on ? '#0b1020' : color.primary,
                      }}
                    >
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span className="min-w-0">
                      <span
                        className="block font-display text-sm font-bold uppercase tracking-[0.14em]"
                        style={{ color: on ? color.accent : '#cbd5e1' }}
                      >
                        {a.name}
                      </span>
                      <span className="block text-sm text-slate-400 truncate">{a.text}</span>
                    </span>
                  </button>
                )
              })}
            </div>

            <div
              className="lg:sticky lg:top-24 rounded-2xl border overflow-hidden bg-[#070910]"
              style={{ borderColor: color.primary + '44' }}
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={picked.name}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.18 }}
                >
                  {pickedShot && (
                    <button
                      type="button"
                      onClick={() => setZoom(picked.shot!)}
                      aria-label={`Enlarge: ${pickedShot.alt}`}
                      className="relative block w-full aspect-[16/9] overflow-hidden"
                    >
                      <Image src={pickedShot.src} alt={pickedShot.alt} fill className="object-contain" sizes="(max-width: 1024px) 100vw, 640px" />
                      <span className="absolute inset-0" style={{ background: 'linear-gradient(to top, #070910, transparent 55%)' }} />
                    </button>
                  )}
                  <div className="p-6">
                    <div className="font-display text-xl font-bold uppercase tracking-[0.12em]" style={{ color: color.accent }}>
                      {picked.name}
                    </div>
                    <p className="mt-2 text-lg text-slate-200">{picked.text}</p>
                    {picked.detail && (
                      <p className="mt-3 font-mono text-sm text-slate-400 border-l-2 pl-3" style={{ borderColor: color.primary }}>
                        {picked.detail}
                      </p>
                    )}
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------- phases */}
      {boss.phases && (
        <section className="py-16 border-t border-white/10">
          <div className="max-w-4xl mx-auto px-4 lg:px-6">
            <h2 className="font-display text-3xl font-bold etu-headline-grad mb-6">{boss.phases.label}</h2>
            <BossPhases phases={boss.phases} color={color} />
          </div>
        </section>
      )}

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

      <Lightbox shots={screenshots} index={zoom} accent={color.primary} onChange={setZoom} />
    </>
  )
}
