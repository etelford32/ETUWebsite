'use client'

import { createElement, Fragment, useEffect, useRef, type CSSProperties } from 'react'
import { ETU_SPRITE_FONT as FONT, TitleMotion, layoutLine, titleWidthEm } from '@/lib/etuTitle'

type TitleTag = 'h1' | 'h2' | 'h3' | 'h4' | 'p' | 'div' | 'span'
export type EtuTitleVariant = 'cyan' | 'amber' | 'violet'

export interface EtuTitleProps {
  /** One string per line. Words inside a line wrap if the line can't fit. */
  text: string | string[]
  as?: TitleTag
  /** Energy colour; `cyan` is the official artwork. */
  variant?: EtuTitleVariant
  /**
   * Shrink (down to half size) so each line fits its container instead of
   * wrapping. The title then sizes to its container (CSS size containment),
   * so it must have a width from its parent: fine in normal blocks and grid
   * cells; in a flex row it grows to fill the free space. Default false.
   */
  fit?: boolean
  /** Use the half-resolution atlas — for titles under ~3rem. */
  compact?: boolean
  /** Optical kerning between letter pairs. Default true. */
  kerning?: boolean
  /** Any motion at all: intro, hover, glints, crystal breathing. Default true. */
  animate?: boolean
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

/**
 * ETU 2175 title typography, built from the letters of the official
 * artwork (public/brand/etu-title-typography.webp) cut into a sprite font
 * by scripts/extract-title-glyphs.py. Each letter is a DOM element animated
 * by TitleMotion. Size it with font-size utilities like any heading.
 * See docs/TITLE_TYPOGRAPHY.md.
 */
export default function EtuTitle({
  text,
  as = 'h2',
  variant = 'cyan',
  fit = false,
  compact = false,
  kerning = true,
  animate = true,
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
  const playIntro = animate && intro

  useEffect(() => {
    const host = hostRef.current
    if (!host || !animate) return
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
  }, [label, animate, intro, stagger, interactive, glints])

  const vars = {
    '--etu-art': `url(${compact ? FONT.artSmall : FONT.art})`,
    '--etu-energy': `url(${FONT.energy})`,
    '--etu-aw': FONT.width,
    '--etu-ah': FONT.height,
    '--etu-frame': FONT.frameHeight,
    '--etu-margin': FONT.margin,
    '--etu-depth': FONT.depth,
    '--etu-fit-em': titleWidthEm(lines, { kerning }),
    ...style,
  } as CSSProperties

  const classes = ['etu-title']
  if (fit) classes.push('etu-title--fit')
  if (playIntro) classes.push('etu-title--intro')
  if (!animate) classes.push('etu-title--still')
  if (className) classes.push(className)

  let index = 0
  return createElement(
    as,
    { ref: hostRef, id, className: classes.join(' '), style: vars, 'data-variant': variant },
    <span className="sr-only">{label}</span>,
    <span className="etu-title__body" aria-hidden="true">
      {lines.map((line, i) => {
        const { words } = layoutLine(line, { kerning })
        return (
          <span key={i} className="etu-title__line">
            {words.map((word, j) => (
              <Fragment key={j}>
                <span className="etu-title__word">
                  {word.glyphs.map(({ char, glyph, kern }, k) =>
                    glyph ? (
                      <span
                        key={k}
                        className="etu-glyph"
                        style={
                          {
                            '--gx': glyph.x,
                            '--gy': glyph.y,
                            '--gw': glyph.w,
                            '--ga': glyph.advance,
                            '--kern': kern,
                            '--i': index++,
                          } as CSSProperties
                        }
                      >
                        <span className="etu-glyph__art" />
                        <span className="etu-glyph__energy" />
                        <span className="etu-glyph__charge" />
                      </span>
                    ) : (
                      <span key={k} className="etu-title__char">
                        {char}
                      </span>
                    ),
                  )}
                </span>
                {/* zero-width break opportunity; the gap itself is a margin */}
                {j < words.length - 1 ? <span className="etu-title__space"> </span> : null}
              </Fragment>
            ))}
          </span>
        )
      })}
    </span>,
  )
}
