'use client'

import { createElement, Fragment, useEffect, useRef, type CSSProperties } from 'react'
import { preload as preloadResource } from 'react-dom'
import { DEPTH_EM, ETU_SPRITE_FONT as FONT, TitleMotion, layoutLine, titleWidthEm } from '@/lib/etuTitle'

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
  /**
   * Fetch the letter atlas early and at high priority. Set it on a title at
   * the top of a page: the atlas is otherwise only discovered once the CSS
   * has been applied, and queues behind everything else. Default false.
   */
  preload?: boolean
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
  /**
   * A drifting 3D point light inside the letters that lights the crystal
   * from within; it follows the cursor while hovered. Default true.
   */
  innerLight?: boolean
  /** Per-word size multipliers, e.g. `{ Universe: 1.5, '2175': 0.7 }`. */
  wordScale?: Record<string, number>
  /** Line indexes flanked by holographic rules on either side. */
  ruled?: number[]
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
  preload = false,
  kerning = true,
  animate = true,
  intro = true,
  stagger,
  interactive = true,
  glints = true,
  innerLight = true,
  wordScale,
  ruled,
  className = '',
  style,
  id,
}: EtuTitleProps) {
  const hostRef = useRef<HTMLElement>(null)
  const lines = Array.isArray(text) ? text : [text]
  const label = lines.join(' ')
  const playIntro = animate && intro
  const scaleKey = wordScale ? JSON.stringify(wordScale) : ''

  useEffect(() => {
    const host = hostRef.current
    if (!host || !animate) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const motion = new TitleMotion(host, {
      intro: intro && !reduced,
      stagger,
      interactive: interactive && !reduced,
      glints: glints && !reduced,
      innerLight: innerLight && !reduced,
    })
    host.dataset.state = 'live'
    return () => {
      motion.dispose()
      delete host.dataset.state
    }
  }, [label, scaleKey, animate, intro, stagger, interactive, glints, innerLight])

  // A full-size title spelled only from the hero's letters ("Explore the
  // Universe 2175") reads them from the hero atlases: same layout, every
  // other cell empty, well under half the bytes.
  const hero = !compact && Array.from(label.replace(/\s+/g, '').toUpperCase()).every((c) => FONT.heroChars.includes(c))
  const art = compact ? FONT.artSmall : hero ? FONT.heroArt : FONT.art
  const artAvif = compact ? FONT.artSmallAvif : hero ? FONT.heroArtAvif : FONT.artAvif
  const energy = hero ? FONT.heroEnergy : FONT.energy

  // The energy layer (the crystal's breathing glow and the inner light's
  // mask) only ever fades in, so it is fetched once the page has loaded
  // instead of competing with the letters and the hero art for bandwidth.
  // Until then [data-energy] is absent and the inner light stays off.
  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    let idle = 0
    const show = () => {
      host.style.setProperty('--etu-energy', `url(${energy})`)
      host.dataset.energy = ''
      host.dispatchEvent(new Event('etu-energy'))
    }
    const schedule = () => {
      idle = window.setTimeout(show, 200)
    }
    if (document.readyState === 'complete') schedule()
    else window.addEventListener('load', schedule, { once: true })
    return () => {
      window.removeEventListener('load', schedule)
      window.clearTimeout(idle)
      host.style.removeProperty('--etu-energy')
      delete host.dataset.energy
    }
  }, [energy])

  // Emits <link rel="preload"> in the document head. Browsers without AVIF
  // skip it (the `type`) and fetch the WebP when the CSS asks for it.
  if (preload) preloadResource(artAvif, { as: 'image', type: 'image/avif', fetchPriority: 'high' })

  const vars = {
    '--etu-art': `url(${art})`,
    // AVIF is under half the bytes; globals.css uses this where image-set()
    // can pick by type, and --etu-art everywhere else.
    '--etu-art-set': `image-set(url("${artAvif}") type("image/avif"), url("${art}") type("image/webp"))`,
    '--etu-aw': FONT.width,
    '--etu-ah': FONT.height,
    '--etu-frame': FONT.frameHeight,
    '--etu-margin': FONT.margin,
    '--etu-depth': FONT.depth,
    '--etu-fit-em': titleWidthEm(lines, { kerning, wordScale }),
    ...style,
  } as CSSProperties

  const classes = ['etu-title']
  if (fit) classes.push('etu-title--fit')
  if (playIntro) classes.push('etu-title--intro')
  if (!animate) classes.push('etu-title--still')
  if (animate && innerLight) classes.push('etu-title--lit')
  if (className) classes.push(className)

  let index = 0
  return createElement(
    as,
    { ref: hostRef, id, className: classes.join(' '), style: vars, 'data-variant': variant },
    <span className="sr-only">{label}</span>,
    <span className="etu-title__body" aria-hidden="true">
      {lines.map((line, i) => {
        const { words } = layoutLine(line, { kerning, wordScale })
        // words are top-aligned; push smaller words down so all letters share a baseline
        const tallest = Math.max(...words.map((w) => w.scale))
        return (
          <span key={i} className={ruled?.includes(i) ? 'etu-title__line etu-title__line--ruled' : 'etu-title__line'}>
            {words.map((word, j) => (
              <Fragment key={j}>
                <span
                  className="etu-title__word"
                  style={
                    word.scale !== 1 || tallest !== 1
                      ? {
                          fontSize: `${word.scale}em`,
                          marginTop: `${((DEPTH_EM * (tallest - word.scale)) / word.scale).toFixed(4)}em`,
                        }
                      : undefined
                  }
                >
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
                        <span className="etu-glyph__core" />
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
