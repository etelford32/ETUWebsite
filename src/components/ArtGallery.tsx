"use client"

import { useState } from 'react'
import Image from 'next/image'
import Lightbox from '@/components/bosses/Lightbox'

export interface ArtPiece {
  src: string
  alt: string
  width: number
  height: number
  /** Short name shown over the piece. */
  title?: string
  /** One or two sentences under the title. */
  caption?: string
}

interface Props {
  pieces: ArtPiece[]
  /** Hex accent for borders and the lightbox frame. */
  accent: string
  className?: string
}

/**
 * Key art laid out at each piece's own proportions, so a tall poster and a
 * wide painting sit side by side without either being cropped. Click any piece
 * to open it full size.
 */
export default function ArtGallery({ pieces, accent, className = '' }: Props) {
  const [open, setOpen] = useState<number | null>(null)

  // Split the pieces into the two columns that end closest to level, keeping
  // their order within each column and the first piece on the left.
  const ratios = pieces.map(p => p.height / p.width)
  let best = 0
  let bestGap = Infinity
  for (let mask = 0; mask < 1 << Math.max(0, pieces.length - 1); mask++) {
    let left = 0
    let right = 0
    ratios.forEach((r, i) => {
      if (i > 0 && (mask >> (i - 1)) & 1) right += r
      else left += r
    })
    const gap = Math.abs(left - right)
    if (gap < bestGap - 1e-6) {
      bestGap = gap
      best = mask
    }
  }
  const columns: { piece: ArtPiece; index: number }[][] = [[], []]
  pieces.forEach((piece, index) => {
    const right = index > 0 && ((best >> (index - 1)) & 1) === 1
    columns[right ? 1 : 0].push({ piece, index })
  })
  const single = pieces.length === 1

  const tile = ({ piece, index }: { piece: ArtPiece; index: number }) => (
    <figure key={piece.src}>
      <button
        type="button"
        onClick={() => setOpen(index)}
        aria-label={`Open full size: ${piece.title ?? piece.alt}`}
        className="group relative block w-full overflow-hidden rounded-xl border bg-black/60 text-left transition-shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
        style={{ borderColor: accent + '40', boxShadow: `0 0 50px ${accent}1f` }}
      >
        <Image
          src={piece.src}
          alt={piece.alt}
          width={piece.width}
          height={piece.height}
          className="h-auto w-full transition-transform duration-700 group-hover:scale-[1.03]"
          sizes={single ? '(max-width: 1024px) 100vw, 960px' : '(max-width: 768px) 100vw, 620px'}
        />
        <span
          className="pointer-events-none absolute right-3 top-3 rounded-full border border-white/25 bg-black/60 px-3 py-1 font-display text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-100 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
          aria-hidden
        >
          View full size
        </span>
      </button>
      {(piece.title || piece.caption) && (
        <figcaption className="mt-3">
          {piece.title && (
            <div
              className="font-display text-sm font-semibold uppercase tracking-[0.14em]"
              style={{ color: accent }}
            >
              {piece.title}
            </div>
          )}
          {piece.caption && (
            <p className="mt-1 text-sm leading-relaxed text-slate-300">{piece.caption}</p>
          )}
        </figcaption>
      )}
    </figure>
  )

  return (
    <>
      {single ? (
        <div className={`mx-auto max-w-4xl ${className}`}>{tile({ piece: pieces[0], index: 0 })}</div>
      ) : pieces.length === 2 ? (
        // Two pieces share a row at the same height, each as wide as its shape needs.
        <div className={`flex flex-col gap-6 md:flex-row md:items-start ${className}`}>
          {pieces.map((piece, index) => (
            <div key={piece.src} className="min-w-0" style={{ flex: `${piece.width / piece.height} 1 0%` }}>
              {tile({ piece, index })}
            </div>
          ))}
        </div>
      ) : (
        <div className={`grid gap-6 md:grid-cols-2 ${className}`}>
          {columns.map((col, i) => (
            <div key={i} className="space-y-6">
              {col.map(tile)}
            </div>
          ))}
        </div>
      )}

      <Lightbox shots={pieces} index={open} accent={accent} onChange={setOpen} />
    </>
  )
}
