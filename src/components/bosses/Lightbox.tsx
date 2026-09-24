"use client"

import { useCallback, useEffect, useRef } from 'react'
import Image from 'next/image'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import type { BossShot } from '@/data/bosses'

interface Props {
  shots: BossShot[]
  index: number | null
  accent: string
  onChange: (index: number | null) => void
}

export default function Lightbox({ shots, index, accent, onChange }: Props) {
  const closeRef = useRef<HTMLButtonElement>(null)
  const open = index !== null
  const count = shots.length

  const step = useCallback(
    (delta: number) => {
      if (index === null) return
      onChange((index + delta + count) % count)
    },
    [index, count, onChange]
  )

  useEffect(() => {
    if (!open) return
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onChange(null)
      else if (e.key === 'ArrowRight') step(1)
      else if (e.key === 'ArrowLeft') step(-1)
    }
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = overflow
      window.removeEventListener('keydown', onKey)
    }
  }, [open, step, onChange])

  return (
    <AnimatePresence>
      {open && index !== null && (
        <motion.div
          key="lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={shots[index].alt}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => onChange(null)}
        >
          <button
            ref={closeRef}
            type="button"
            aria-label="Close"
            onClick={() => onChange(null)}
            className="absolute top-4 right-4 w-11 h-11 rounded-full border border-white/20 bg-white/5 text-slate-200 hover:bg-white/10 flex items-center justify-center"
          >
            <X size={20} />
          </button>

          <div className="relative w-full max-w-4xl" onClick={e => e.stopPropagation()}>
            <AnimatePresence mode="wait">
              <motion.div
                key={shots[index].src}
                className="relative aspect-square w-full max-h-[80vh] mx-auto rounded-xl overflow-hidden border bg-[#070910]"
                style={{ borderColor: accent + '55' }}
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.18 }}
              >
                <Image src={shots[index].src} alt={shots[index].alt} fill className="object-contain" sizes="(max-width: 900px) 100vw, 900px" />
              </motion.div>
            </AnimatePresence>
            <div className="mt-3 flex items-center justify-between text-sm text-slate-400">
              <span>{shots[index].alt}</span>
              <span className="font-mono">
                {index + 1} / {count}
              </span>
            </div>

            {count > 1 && (
              <>
                <button
                  type="button"
                  aria-label="Previous screenshot"
                  onClick={() => step(-1)}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full border border-white/20 bg-black/60 text-slate-100 hover:bg-black/80 flex items-center justify-center"
                >
                  <ChevronLeft size={22} />
                </button>
                <button
                  type="button"
                  aria-label="Next screenshot"
                  onClick={() => step(1)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full border border-white/20 bg-black/60 text-slate-100 hover:bg-black/80 flex items-center justify-center"
                >
                  <ChevronRight size={22} />
                </button>
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
