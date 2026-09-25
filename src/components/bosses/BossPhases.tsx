"use client"

import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import type { Boss } from '@/data/bosses'

type Phases = NonNullable<Boss['phases']>

function pct(at: string) {
  return Math.max(0, Math.min(100, parseFloat(at)))
}

export default function BossPhases({ phases, color }: { phases: Phases; color: Boss['color'] }) {
  const [active, setActive] = useState(0)
  const [auto, setAuto] = useState(phases.kind === 'cycle')
  const reduce = useReducedMotion()
  const steps = phases.steps

  // The burn cycle plays itself, at its real durations, until touched.
  useEffect(() => {
    if (!auto || reduce) return
    const ms = parseFloat(steps[active].at) * 1000 || 1000
    const t = setTimeout(() => setActive(i => (i + 1) % steps.length), Math.max(ms, 900))
    return () => clearTimeout(t)
  }, [auto, reduce, active, steps])

  const pick = (i: number) => {
    setAuto(false)
    setActive(i)
  }

  const current = steps[active]

  return (
    <div>
      {phases.kind === 'health' ? (
        <div className="relative pt-8 pb-2">
          {/* Hull bar: drains from the right to the phase's mark. */}
          <div className="relative h-3 rounded-full bg-white/[0.06] overflow-hidden border border-white/10">
            <motion.div
              className="absolute inset-y-0 left-0 rounded-full"
              style={{ background: `linear-gradient(90deg, ${color.secondary}, ${color.primary})` }}
              animate={{ width: `${pct(current.at)}%` }}
              transition={{ type: 'spring', stiffness: 120, damping: 20 }}
            />
          </div>
          {steps.map((s, i) => {
            const left = pct(s.at)
            const on = i === active
            return (
              <button
                key={s.name}
                type="button"
                onClick={() => pick(i)}
                aria-pressed={on}
                className="absolute top-0 -translate-x-1/2 flex flex-col items-center group"
                style={{ left: `${Math.min(Math.max(left, 4), 96)}%` }}
              >
                <span
                  className="font-mono text-[11px] mb-1 transition-colors"
                  style={{ color: on ? color.accent : '#64748b' }}
                >
                  {s.at}
                </span>
                <span
                  className="block w-4 h-4 rounded-full border-2 transition-transform group-hover:scale-125"
                  style={{
                    borderColor: on ? color.accent : '#475569',
                    background: on ? color.primary : '#0b1020',
                    boxShadow: on ? `0 0 12px ${color.primary}` : 'none',
                  }}
                />
              </button>
            )
          })}
        </div>
      ) : (
        <div className="flex gap-1.5 h-12">
          {steps.map((s, i) => {
            const on = i === active
            return (
              <button
                key={s.name}
                type="button"
                onClick={() => pick(i)}
                aria-pressed={on}
                className="relative rounded-md overflow-hidden border text-left px-2 transition-colors"
                style={{
                  flexGrow: parseFloat(s.at) || 1,
                  flexBasis: 0,
                  borderColor: on ? color.primary : 'rgba(255,255,255,0.1)',
                  background: on ? color.primary + '22' : 'rgba(255,255,255,0.03)',
                }}
              >
                {on && auto && !reduce && (
                  <motion.span
                    key={`fill-${active}`}
                    className="absolute inset-y-0 left-0"
                    style={{ background: color.primary + '33' }}
                    initial={{ width: 0 }}
                    animate={{ width: '100%' }}
                    transition={{ duration: Math.max(parseFloat(s.at), 0.9), ease: 'linear' }}
                  />
                )}
                <span className="relative block font-display text-[10px] sm:text-xs font-bold uppercase tracking-[0.12em] truncate" style={{ color: on ? color.accent : '#94a3b8' }}>
                  {s.name}
                </span>
                <span className="relative block font-mono text-[10px] text-slate-500">{s.at}</span>
              </button>
            )
          })}
        </div>
      )}

      <div className="mt-6 min-h-[5.5rem]">
        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.16 }}
          >
            <div className="font-display text-sm font-bold uppercase tracking-[0.16em]" style={{ color: color.accent }}>
              {current.name}
            </div>
            {current.line && (
              <p className={`mt-2 text-lg ${current.spoken ? 'italic text-slate-100' : 'text-slate-300'}`}>
                {current.spoken ? <>&ldquo;{current.line}&rdquo;</> : current.line}
              </p>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
