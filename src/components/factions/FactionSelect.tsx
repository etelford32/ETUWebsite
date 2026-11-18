"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

/** What the select screen needs to show a faction. Built on the server. */
export interface FactionSelectItem {
  id: string
  short: string
  sub: string
  tagline: string
  live: boolean
  kind: string
  art: string
  /** Placeholder art (no faction painting yet) sits further back. */
  artIsPlaceholder: boolean
  artPosition: string
  emblem?: { src: string; alt: string }
  homeZone?: string
  homePlanet?: string
  color: { primary: string; secondary: string; accent: string }
  leaders: { name: string; title: string }[]
  description?: string
  /** Strengths, or failing that what they bring. */
  highlights: string[]
  featurePage?: { href: string; label: string }
  bossCount: number
}

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'live', label: 'In the playtest' },
  { key: 'dev', label: 'In development' },
] as const
type FilterKey = (typeof FILTERS)[number]['key']

/**
 * The website's version of the Strategy faction-select screen: a bordered
 * console, the intel panel down the left showing the faction in focus,
 * every faction as a card in a grid on the right, and DEPLOY underneath.
 * Click (or arrow keys) to focus a faction; DEPLOY, Enter or a second
 * click opens its dossier. The focused faction is kept in ?faction= so a
 * link can open the screen on it.
 */
export default function FactionSelect({ factions }: { factions: FactionSelectItem[] }) {
  const router = useRouter()
  const [filter, setFilter] = useState<FilterKey>('all')
  const [focusId, setFocusId] = useState(factions[0]?.id)
  const intelRef = useRef<HTMLDivElement>(null)
  const gridRef = useRef<HTMLDivElement>(null)

  const shown = useMemo(
    () =>
      factions.filter(f => (filter === 'all' ? true : filter === 'live' ? f.live : !f.live)),
    [factions, filter]
  )
  const focused = factions.find(f => f.id === focusId) ?? factions[0]

  // Open on the faction named in the URL, if any.
  useEffect(() => {
    const wanted = new URLSearchParams(window.location.search).get('faction')
    if (wanted && factions.some(f => f.id === wanted)) setFocusId(wanted)
  }, [factions])

  const select = useCallback((id: string, scrollIntel: boolean) => {
    setFocusId(id)
    try {
      const url = new URL(window.location.href)
      url.searchParams.set('faction', id)
      window.history.replaceState(null, '', url)
    } catch {}
    // On a narrow screen the intel panel sits above the grid: bring it back.
    if (scrollIntel && window.matchMedia('(max-width: 1023px)').matches) {
      intelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [])

  // A filter that hides the focused faction moves focus to the first shown.
  useEffect(() => {
    if (shown.length && !shown.some(f => f.id === focusId)) setFocusId(shown[0].id)
  }, [shown, focusId])

  const deploy = useCallback(() => {
    if (focused) router.push(`/factions/${focused.id}`)
  }, [focused, router])

  // Arrow keys move through the grid by its real column count.
  function onGridKey(e: React.KeyboardEvent) {
    const i = shown.findIndex(f => f.id === focusId)
    if (i < 0) return
    const grid = gridRef.current
    const cols = grid
      ? getComputedStyle(grid).gridTemplateColumns.split(' ').filter(Boolean).length || 1
      : 1
    const moves: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -cols, ArrowDown: cols }
    if (e.key in moves) {
      e.preventDefault()
      const next = shown[Math.max(0, Math.min(shown.length - 1, i + moves[e.key]))]
      select(next.id, false)
      grid?.querySelector<HTMLButtonElement>(`[data-faction="${next.id}"]`)?.focus()
    } else if (e.key === 'Enter') {
      e.preventDefault()
      deploy()
    }
  }

  if (!focused) return null
  const c = focused.color

  return (
    <div
      className="relative isolate rounded-2xl border bg-slate-950/40 p-3 sm:p-5 transition-[border-color,box-shadow] duration-300"
      style={{ borderColor: c.primary + '66', boxShadow: `0 0 0 1px rgba(255,255,255,0.03), 0 0 80px ${c.primary}22` }}
    >
      {/* The focused faction's art, far back behind the console */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-2xl">
        {!focused.artIsPlaceholder && (
          <Image
            key={focused.id}
            src={focused.art}
            alt=""
            fill
            sizes="100vw"
            className="object-cover opacity-25 blur-2xl scale-110 animate-fadeIn"
            style={{ objectPosition: focused.artPosition }}
          />
        )}
        <div className="absolute inset-0 bg-slate-950/70" />
      </div>

      {/* Corner ticks, as the game draws its panel */}
      {['top-0 left-0 border-t-2 border-l-2', 'top-0 right-0 border-t-2 border-r-2', 'bottom-0 left-0 border-b-2 border-l-2', 'bottom-0 right-0 border-b-2 border-r-2'].map(pos => (
        <span
          key={pos}
          aria-hidden
          className={`pointer-events-none absolute w-5 h-5 rounded-[3px] ${pos}`}
          style={{ borderColor: c.accent }}
        />
      ))}

      {/* Console header */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-1 pb-4 border-b border-white/10">
        <div>
          <div className="font-display text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">
            Strategy · Faction Select
          </div>
          <div className="mt-1 font-display text-xl sm:text-2xl font-bold text-white">Choose your faction</div>
        </div>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter factions">
          {FILTERS.map(f => {
            const active = filter === f.key
            const count = f.key === 'all' ? factions.length : factions.filter(x => (f.key === 'live' ? x.live : !x.live)).length
            return (
              <button
                key={f.key}
                type="button"
                aria-pressed={active}
                onClick={() => setFilter(f.key)}
                className={`px-3 py-1.5 rounded-full font-display text-[11px] font-semibold uppercase tracking-[0.16em] transition-colors ${
                  active
                    ? 'bg-cyan-500/20 border border-cyan-400/60 text-cyan-100'
                    : 'border border-white/15 text-slate-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                {f.label} <span className="font-mono opacity-70">{count}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="mt-4 grid lg:grid-cols-[minmax(0,23rem)_minmax(0,1fr)] gap-4">
        {/* Intel panel */}
        <div ref={intelRef} className="scroll-mt-20 lg:sticky lg:top-20 self-start">
          <Intel faction={focused} onDeploy={deploy} />
        </div>

        {/* Card grid */}
        <div>
          <div
            ref={gridRef}
            role="listbox"
            aria-label="Factions"
            aria-activedescendant={`fs-${focused.id}`}
            onKeyDown={onGridKey}
            className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3"
          >
            {shown.map(f => (
              <Card
                key={f.id}
                faction={f}
                selected={f.id === focused.id}
                onSelect={() => (f.id === focused.id ? deploy() : select(f.id, true))}
              />
            ))}
          </div>
          <p className="mt-4 text-center text-xs text-slate-400">
            <Kbd>←</Kbd> <Kbd>→</Kbd> <Kbd>↑</Kbd> <Kbd>↓</Kbd> select ·{' '}
            <Kbd>Enter</Kbd> or click again to deploy
          </p>
        </div>
      </div>
    </div>
  )
}

/** No painting yet: the faction's initial, struck in its own colour. */
function Sigil({ faction: f, size }: { faction: FactionSelectItem; size: string }) {
  return (
    <div
      aria-hidden
      className="absolute inset-0 flex items-center justify-center"
      style={{
        background: `radial-gradient(circle at 50% 42%, ${f.color.primary}40 0%, ${f.color.secondary}14 45%, rgba(4,6,20,1) 78%)`,
      }}
    >
      <span
        className={`font-display ${size} font-bold leading-none -translate-y-2`}
        style={{ color: 'transparent', WebkitTextStroke: `2px ${f.color.accent}`, textShadow: `0 0 40px ${f.color.primary}` }}
      >
        {f.short.charAt(0)}
      </span>
    </div>
  )
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-block min-w-[1.5rem] px-1.5 py-0.5 rounded border border-white/20 bg-white/5 font-mono text-[11px] text-slate-300">
      {children}
    </kbd>
  )
}

function Card({
  faction: f,
  selected,
  onSelect,
}: {
  faction: FactionSelectItem
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      id={`fs-${f.id}`}
      data-faction={f.id}
      role="option"
      aria-selected={selected}
      tabIndex={selected ? 0 : -1}
      onClick={onSelect}
      className={`group relative block w-full overflow-hidden rounded-xl border text-left bg-black transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 ${
        selected ? 'scale-[1.02]' : 'hover:-translate-y-0.5'
      }`}
      style={{
        borderColor: selected ? f.color.accent : f.live ? f.color.primary + '66' : 'rgba(58,70,90,0.9)',
        boxShadow: selected ? `0 0 0 1px ${f.color.accent}, 0 0 28px ${f.color.primary}66` : undefined,
      }}
    >
      <div className="relative aspect-[16/10]">
        {f.artIsPlaceholder ? (
          <Sigil faction={f} size="text-6xl" />
        ) : (
          <Image
            src={f.art}
            alt=""
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 260px"
            className={`object-cover transition-transform duration-500 group-hover:scale-105 ${f.live ? '' : 'opacity-75'}`}
            style={{ objectPosition: f.artPosition }}
          />
        )}
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(to top, rgba(4,6,20,0.96) 0%, rgba(4,6,20,0.55) 45%, rgba(4,6,20,0.05) 100%)' }}
        />
        {f.emblem ? (
          <span
            className="absolute top-2 right-2 w-9 h-9 sm:w-11 sm:h-11 rounded-lg overflow-hidden border bg-black"
            style={{ borderColor: f.color.primary + '99' }}
          >
            <Image src={f.emblem.src} alt="" fill sizes="44px" className="object-cover" />
          </span>
        ) : f.artIsPlaceholder ? null : (
          <span
            aria-hidden
            className="absolute top-2 right-2 w-9 h-9 sm:w-11 sm:h-11 rounded-lg border bg-black/70 flex items-center justify-center font-display text-lg font-bold"
            style={{ borderColor: f.color.primary + '66', color: f.color.accent }}
          >
            {f.short.charAt(0)}
          </span>
        )}
        {!f.live && (
          <span className="absolute top-2 left-2 rounded-full bg-black/75 border border-amber-400/40 px-2 py-0.5 font-display text-[9px] font-semibold uppercase tracking-[0.16em] text-amber-300">
            In dev
          </span>
        )}
        <div className="absolute inset-x-0 bottom-0 p-2.5 sm:p-3">
          <div className="font-display text-sm sm:text-base font-bold text-white leading-tight truncate">{f.short}</div>
          {f.sub && (
            <div
              className="mt-0.5 font-display text-[9px] sm:text-[10px] font-semibold uppercase tracking-[0.14em] truncate"
              style={{ color: f.color.accent }}
            >
              {f.sub}
            </div>
          )}
        </div>
        {selected && (
          <span
            aria-hidden
            className="absolute inset-x-0 bottom-0 h-0.5"
            style={{ background: `linear-gradient(90deg, transparent, ${f.color.accent}, transparent)` }}
          />
        )}
      </div>
    </button>
  )
}

function Intel({ faction: f, onDeploy }: { faction: FactionSelectItem; onDeploy: () => void }) {
  return (
    <div
      className="rounded-xl border bg-[rgba(8,13,22,0.9)] overflow-hidden"
      style={{ borderColor: f.color.primary + '55' }}
    >
      {/* Art, crossfading on each change */}
      <div key={f.id} className="relative aspect-[16/10] bg-black animate-fadeIn">
        {f.artIsPlaceholder ? (
          <Sigil faction={f} size="text-8xl" />
        ) : (
          <Image
            src={f.art}
            alt=""
            fill
            sizes="(max-width: 1024px) 100vw, 368px"
            className="object-cover"
            style={{ objectPosition: f.artPosition }}
            priority
          />
        )}
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(to top, rgba(8,13,22,1) 0%, rgba(8,13,22,0.3) 55%, rgba(8,13,22,0) 100%)' }}
        />
        {f.emblem && (
          <span
            className="absolute -bottom-0 left-4 w-16 h-16 rounded-xl overflow-hidden border-2 bg-black shadow-lg"
            style={{ borderColor: f.color.accent, boxShadow: `0 0 24px ${f.color.primary}88` }}
          >
            <Image src={f.emblem.src} alt={f.emblem.alt} fill sizes="64px" className="object-cover" />
          </span>
        )}
      </div>

      <div className="p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className="font-display text-[10px] font-semibold uppercase tracking-[0.2em]"
            style={{ color: f.color.accent }}
          >
            {f.kind}
          </span>
          {f.live ? (
            <span className="etu-pill etu-pill--green !text-[10px] !py-0.5">In the playtest</span>
          ) : (
            <span className="etu-pill etu-pill--amber !text-[10px] !py-0.5">In development</span>
          )}
        </div>
        <h2 className="mt-2 font-display text-2xl sm:text-3xl font-bold text-white leading-tight">{f.short}</h2>
        {f.sub && (
          <div className="font-display text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: f.color.accent }}>
            {f.sub}
          </div>
        )}
        <p className="mt-3 text-[15px] text-slate-100 leading-snug">{f.tagline}</p>

        <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm">
          {f.leaders.length > 0 && (
            <>
              <dt className="text-slate-500">{f.leaders.length > 1 ? 'Leaders' : 'Leader'}</dt>
              <dd className="text-slate-200">
                {f.leaders.map((l, i) => (
                  <span key={l.name}>
                    {i > 0 && ', '}
                    {l.name}
                    <span className="text-slate-500"> · {l.title}</span>
                  </span>
                ))}
              </dd>
            </>
          )}
          {f.homeZone && (
            <>
              <dt className="text-slate-500">Zone</dt>
              <dd className="text-slate-200 font-mono text-[13px]">{f.homeZone}</dd>
            </>
          )}
          {f.homePlanet && (
            <>
              <dt className="text-slate-500">Home</dt>
              <dd className="text-slate-200 font-mono text-[13px]">{f.homePlanet}</dd>
            </>
          )}
          {f.bossCount > 0 && (
            <>
              <dt className="text-slate-500">Bosses</dt>
              <dd className="text-slate-200 font-mono text-[13px]">{f.bossCount}</dd>
            </>
          )}
        </dl>

        {f.description && (
          <p className="mt-4 text-sm text-slate-300 leading-relaxed line-clamp-5">{f.description}</p>
        )}

        {f.highlights.length > 0 && (
          <ul className="mt-4 space-y-1.5">
            {f.highlights.slice(0, 4).map(h => (
              <li key={h} className="flex gap-2 text-sm text-slate-200">
                <span className="mt-[7px] w-1.5 h-1.5 shrink-0 rotate-45" style={{ background: f.color.accent }} aria-hidden />
                {h}
              </li>
            ))}
          </ul>
        )}

        <button
          type="button"
          onClick={onDeploy}
          className="mt-5 w-full rounded-lg border-2 py-3 font-display text-sm font-bold uppercase tracking-[0.3em] text-white transition-[filter,transform] hover:brightness-125 active:scale-[0.99]"
          style={{
            borderColor: f.color.accent,
            background: `linear-gradient(135deg, ${f.color.primary}55, ${f.color.secondary}33)`,
            boxShadow: `0 0 24px ${f.color.primary}44`,
          }}
        >
          Deploy · Open dossier
        </button>
        {f.featurePage && (
          <Link
            href={f.featurePage.href}
            className="mt-2 block text-center text-xs font-semibold text-cyan-300 hover:text-cyan-200"
          >
            {f.featurePage.label} →
          </Link>
        )}
      </div>
    </div>
  )
}
