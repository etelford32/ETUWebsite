'use client'

import { createElement, Fragment, useEffect, useRef, type CSSProperties } from 'react'
import { ETU_SPRITE_FONT as FONT, TitleMotion } from '@/lib/etuTitle'

type TitleTag = 'h1' | 'h2' | 'h3' | 'h4' | 'p' | 'div' | 'span'
export type EtuTitleVariant = 'cyan' | 'amber' | 'violet'

export interface EtuTitleProps {
  /** One string per line. Words inside a line wrap naturally. */
  text: string | string[]
  as?: TitleTag
  /** Energy colour; `cyan` is the official artwork. */
  variant?: EtuTitleVariant
  /** Letters drop in one by one the first time the title is seen. */
  intro?: boolean
  /** Seconds between letters in the intro. */
  stagger?: number
  /** Letters lift and charge under the cursor; click sends a shockwave. */
  interactive?: boolean
  /** Idle star glints. */
  glints?: boolean
  className?: string
  style?: CSSProperties
  id?: string
}

/** Sprite-font metrics exposed to CSS (see .etu-title in globals.css). */
const FONT_VARS = {
  '--etu-art': `url(${FONT.art})`,
  '--etu-energy': `url(${FONT.energy})`,
  '--etu-aw': FONT.width,
  '--etu-ah': FONT.height,
  '--etu-frame': FONT.frameHeight,
  '--etu-margin': FONT.margin,
  '--etu-depth': FONT.depth,
} as CSSProperties

/**
 * ETU 2175 title typography, built from the letters of the official
 * artwork (public/brand/etu-title-typography.webp) cut into a sprite font
 * by scripts/extract-title-glyphs.py. Each letter is a DOM element animated
 * by TitleMotion. Size it with font-size utilities like any heading.
 */
export default function EtuTitle({
  text,
  as = 'h2',
  variant = 'cyan',
  intro = true,
  stagger,
  interactive = true,
  glints = true,
  className = '',
  style,
  id,
}: EtuTitleProps) {
  const hostRef = useRef<HTMLElement>(null)
  const lines = Array.isArray(text) ? text : [text]
  const label = lines.join(' ')

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const motion = new TitleMotion(host, {
      intro: intro && !reduced,
      stagger,
      interactive: interactive && !reduced,
      glints: glints && !reduced,
    })
    host.dataset.state = 'live'
    return () => {
      motion.dispose()
      delete host.dataset.state
    }
  }, [label, intro, stagger, interactive, glints])

  let index = 0
  return createElement(
    as,
    {
      ref: hostRef,
      id,
      className: `etu-title${intro ? ' etu-title--intro' : ''}${className ? ` ${className}` : ''}`,
      style: { ...FONT_VARS, ...style },
      'data-variant': variant,
    },
    <span className="sr-only">{label}</span>,
    lines.map((line, i) => {
      const words = line.split(/\s+/).filter(Boolean)
      return (
        <span key={i} className="etu-title__line" aria-hidden="true">
          {words.map((word, j) => (
            <Fragment key={j}>
              <span className="etu-title__word">
                {Array.from(word.toUpperCase()).map((ch, k) => {
                  const g = FONT.glyphs[ch]
                  if (!g) {
                    return (
                      <span key={k} className="etu-title__char">
                        {ch}
                      </span>
                    )
                  }
                  const vars = {
                    '--gx': g.x,
                    '--gy': g.y,
                    '--gw': g.w,
                    '--ga': g.advance,
                    '--i': index++,
                  } as CSSProperties
                  return (
                    <span key={k} className="etu-glyph" style={vars}>
                      <span className="etu-glyph__art" />
                      <span className="etu-glyph__energy" />
                      <span className="etu-glyph__charge" />
                    </span>
                  )
                })}
              </span>
              {j < words.length - 1 ? ' ' : null}
            </Fragment>
          ))}
        </span>
      )
    }),
  )
}
