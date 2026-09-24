"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { AnimatePresence, motion } from 'framer-motion'
import type { Boss } from '@/data/bosses'

export interface RosterEntry {
  boss: Boss
  faction?: { id: string; short: string }
}

export default function BossRoster({ entries }: { entries: RosterEntry[] }) {
  const [filter, setFilter] = useState<string>('all')
  const [selected, setSelected] = useState(entries[0].boss.id)
  const railRef = useRef<HTMLDivElement>(null)

  const factions = useMemo(() => {
    const seen = new Map<string, string>()
    entries.forEach(e => e.faction && seen.set(e.faction.id, e.faction.short))
    return [...seen.entries()]
  }, [entries])

  const visible = entries.filter(e => filter === 'all' || e.faction?.id === filter)
  const current = entries.find(e => e.boss.id === selected) ?? entries[0]
  const boss = current.boss

  const select = useCallback((id: string) => {
    setSelected(id)
    try {
      history.replaceState(null, '', `#${id}`)
    } catch {}
  }, [])

  // Deep link: /bosses#sidewinder opens on that boss.
  useEffect(() => {
    const id = window.location.hash.slice(1)
    if (id && entries.some(e => e.boss.id === id)) setSelected(id)
  }, [entries])

  // Keep the selected tile in view when the rail scrolls sideways (mobile).
  useEffect(() => {
    const rail = railRef.current
    const tile = rail?.querySelector<HTMLElement>(`[data-boss="${selected}"]`)
    if (!rail || !tile || rail.scrollWidth <= rail.clientWidth) return
    rail.scrollTo({ left: tile.offsetLeft - (rail.clientWidth - tile.offsetWidth) / 2, behavior: 'smooth' })
  }, [selected, filter])

  // Arrow keys walk the visible roster.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      const i = visible.findIndex(v => v.boss.id === selected)
      if (i < 0 || visible.length < 2) return
      e.preventDefault()
      const step = e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 1
      select(visible[(i + step + visible.length) % visible.length].boss.id)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [visible, selected, select])

  const pickFilter = (key: string) => {
    setFilter(key)
    const pool = entries.filter(e => key === 'all' || e.faction?.id === key)
    if (!pool.some(e => e.boss.id === selected) && pool[0]) select(pool[0].boss.id)
  }

  return (
    <div>
      {/* Faction filter */}
      <div className="flex flex-wrap gap-2 mb-8">
        {[['all', 'All'] as const, ...factions].map(([key, label]) => {
          const on = filter === key
          return (
            <button
              key={key}
              type="button"
              aria-pressed={on}
              onClick={() => pickFilter(key)}
              className={`px-4 py-2 rounded-full font-display text-xs font-semibold uppercase tracking-[0.16em] transition-all border ${
                on
                  ? 'bg-cyan-500/15 border-cyan-400/50 text-cyan-200'
                  : 'bg-white/[0.03] border-white/10 text-slate-400 hover:bg-white/[0.06] hover:text-slate-200'
              }`}
            >
              {label}
            </button>
          )
        })}
      </div>

      <div className="grid lg:grid-cols-[1fr_300px] gap-6">
        {/* Spotlight */}
        <div
          className="relative overflow-hidden rounded-2xl border bg-[#070910] order-2 lg:order-1"
          style={{ borderColor: boss.color.primary + '55', boxShadow: `0 0 80px ${boss.color.primary}1f` }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={boss.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22 }}
              className="grid md:grid-cols-2"
            >
              <Link href={`/bosses/${boss.id}`} className="group relative block aspect-square overflow-hidden">
                <motion.div
                  className="absolute inset-0"
                  initial={{ scale: 1.06 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                >
                  <Image
                    src={boss.heroImage}
                    alt={boss.name}
                    fill
                    priority
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    sizes="(max-width: 768px) 100vw, 480px"
                  />
                </motion.div>
                <span
                  className="absolute inset-0 pointer-events-none"
                  style={{ background: `radial-gradient(circle at 50% 50%, transparent 55%, #070910 100%)` }}
                />
              </Link>

              <div
                className="relative p-6 md:p-8 flex flex-col"
                style={{ background: `linear-gradient(160deg, ${boss.color.primary}14, transparent 60%)` }}
              >
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  {boss.tier && (
                    <span
                      className="etu-pill"
                      style={{ borderColor: boss.color.primary + '66', background: boss.color.primary + '1A', color: boss.color.accent }}
                    >
                      {boss.tier}
                    </span>
                  )}
                  {current.faction && <span className="etu-pill text-slate-300 border-white/15">{current.faction.short}</span>}
                </div>
                <h2 className="font-display text-3xl md:text-4xl font-bold leading-tight" style={{ color: boss.color.accent }}>
                  {boss.name}
                </h2>
                <p className="mt-3 text-slate-300">{boss.tagline}</p>

                <dl className="mt-6 flex flex-wrap gap-x-6 gap-y-3">
                  {boss.stats.slice(0, 2).map(s => (
                    <div key={s.label}>
                      <dt className="eyebrow mb-0.5">{s.label}</dt>
                      <dd className="font-mono text-lg" style={{ color: boss.color.accent }}>{s.value}</dd>
                    </div>
                  ))}
                </dl>

                <ul className="mt-6 flex flex-wrap gap-2">
                  {boss.abilities.map(a => (
                    <li
                      key={a.name}
                      className="text-xs font-display uppercase tracking-[0.12em] rounded-md border px-2.5 py-1"
                      style={{ borderColor: boss.color.primary + '44', color: '#cbd5e1' }}
                    >
                      {a.name}
                    </li>
                  ))}
                </ul>

                <div className="mt-auto pt-8">
                  <Link
                    href={`/bosses/${boss.id}`}
                    className="inline-flex items-center gap-2 rounded-lg px-5 py-3 font-display text-xs font-bold uppercase tracking-[0.18em] transition-transform hover:translate-x-0.5"
                    style={{ background: boss.color.primary, color: '#0b1020' }}
                  >
                    Open dossier <span aria-hidden>→</span>
                  </Link>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Rail */}
        <div
          ref={railRef}
          className="relative order-1 lg:order-2 flex lg:flex-col gap-2 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0 -mx-4 px-4 lg:mx-0 lg:px-0 snap-x"
          role="tablist"
          aria-label="Bosses"
        >
          {visible.map(({ boss: b }) => {
            const on = b.id === boss.id
            return (
              <button
                key={b.id}
                data-boss={b.id}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => select(b.id)}
                className="group snap-start shrink-0 w-44 lg:w-full flex items-center gap-3 rounded-xl border p-2 text-left transition-all"
                style={{
                  borderColor: on ? b.color.primary : 'rgba(255,255,255,0.08)',
                  background: on ? b.color.primary + '1A' : 'rgba(255,255,255,0.02)',
                }}
              >
                <span className="relative w-12 h-12 shrink-0 overflow-hidden rounded-lg bg-[#070910]">
                  <Image src={b.heroImage} alt="" fill className="object-cover transition-transform group-hover:scale-110" sizes="48px" />
                </span>
                <span className="min-w-0">
                  <span
                    className="block font-display text-xs font-bold uppercase tracking-[0.12em] truncate"
                    style={{ color: on ? b.color.accent : '#cbd5e1' }}
                  >
                    {b.name}
                  </span>
                  <span className="block text-[11px] font-mono text-slate-500 truncate">{b.tier ?? b.homePlanet}</span>
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
