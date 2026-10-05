'use client'

import { createElement, Fragment, useEffect, useId, useRef, useState, type CSSProperties } from 'react'
import {
  ETU_CAP_EM,
  EtuTitleRenderer,
  layoutRun,
  runPathData,
  type EtuTitleVariant,
  type GlyphPlacement,
} from '@/lib/etuTitle'

type TitleTag = 'h1' | 'h2' | 'h3' | 'h4' | 'p' | 'div' | 'span'

export interface EtuTitleProps {
  /** One string per line. Words inside a line wrap naturally. */
  text: string | string[]
  as?: TitleTag
  /** Energy colour; `cyan` is the official treatment. */
  variant?: EtuTitleVariant
  /** Glow intensity override (preset default is ~1). */
  energy?: number
  /** Letters drop in and lock their tiles the first time the title is seen. */
  intro?: boolean
  /** Seconds between letters in the intro. */
  stagger?: number
  /** Ambient pulses, sparkles and idle glints after the intro. */
  animate?: boolean
  /** Letters lift and charge under the cursor; click sends a shockwave. */
  interactive?: boolean
  className?: string
  style?: CSSProperties
  id?: string
}

type GlState = 'pending' | 'on' | 'off'

const MAX_DPR = 2
const MAX_PIXELS = 4_000_000
/** Canvas bleed around the text for walls, halo and glints, × cap height. */
const BLEED = 0.7
const FONT_TIMEOUT_MS = 3000

/**
 * ETU 2175 title typography. Letters come from the ETU glyph set
 * (src/lib/etuTitle/glyphs.ts) and render three ways at once:
 *   - real text, transparent, for selection, search and screen readers
 *   - an inline SVG of the glyphs — the layout source and the no-WebGL look
 *   - a WebGL canvas on top that animates each letter as a GlyphActor
 * Size it with font-size utilities like any heading.
 */
export default function EtuTitle({
  text,
  as = 'h2',
  variant = 'cyan',
  energy,
  intro = true,
  stagger,
  animate = true,
  interactive = true,
  className = '',
  style,
  id,
}: EtuTitleProps) {
  const hostRef = useRef<HTMLElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [gl, setGl] = useState<GlState>('pending')
  const gradId = `etu-fill-${useId().replace(/:/g, '')}`

  const lines = Array.isArray(text) ? text : [text]
  const textKey = lines.join('\n')

  useEffect(() => {
    const host = hostRef.current
    const canvas = canvasRef.current
    if (!host || !canvas) return

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const renderer = EtuTitleRenderer.isSupported()
      ? EtuTitleRenderer.create(canvas, {
          variant,
          energy,
          intro: intro && !reduced,
          stagger,
          animate: animate && !reduced,
        })
      : null
    if (!renderer) {
      setGl('off')
      return
    }

    let disposed = false
    let ready = false
    let visible = false
    let resizeTimer = 0

    const layout = () => {
      const words = Array.from(host.querySelectorAll<SVGSVGElement>('[data-etu-word]'))
      if (!words.length) return
      const hostRect = host.getBoundingClientRect()
      const rects = words.map((w) => w.getBoundingClientRect())
      const capMax = Math.max(...rects.map((r) => r.height), 1)
      const bleed = Math.ceil(capMax * BLEED)
      // Never bleed sideways past the viewport: it would add a horizontal scrollbar.
      const vw = document.documentElement.clientWidth
      const left = Math.min(bleed, Math.max(0, Math.floor(hostRect.left)))
      const right = Math.min(bleed, Math.max(0, Math.floor(vw - hostRect.right)))
      const width = hostRect.width + left + right
      const height = hostRect.height + bleed * 2

      let dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR)
      if (width * height * dpr * dpr > MAX_PIXELS) dpr = Math.sqrt(MAX_PIXELS / (width * height))

      const glyphs: GlyphPlacement[] = []
      words.forEach((w, i) => {
        const r = rects[i]
        const cap = r.height
        const x0 = r.left - hostRect.left + left
        const y0 = r.top - hostRect.top + bleed
        for (const g of layoutRun(w.dataset.etuWord ?? '').glyphs) {
          if (g.glyph.contours.length) glyphs.push({ glyph: g.glyph, x: x0 + g.x * cap, y: y0, cap })
        }
      })

      canvas.style.left = `${-left}px`
      canvas.style.top = `${-bleed}px`
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      renderer.setLayout({ width, height, dpr, glyphs })
    }

    const sync = () => {
      if (!ready) return
      if (visible && !document.hidden) renderer.start()
      else renderer.stop()
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting
        sync()
      },
      { threshold: 0.15 },
    )
    io.observe(host)

    const onResize = () => {
      window.clearTimeout(resizeTimer)
      resizeTimer = window.setTimeout(() => ready && layout(), 120)
    }
    const ro = new ResizeObserver(onResize)
    ro.observe(host)
    window.addEventListener('resize', onResize)
    document.addEventListener('visibilitychange', sync)

    const local = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect()
      return { x: e.clientX - r.left, y: e.clientY - r.top }
    }
    const onMove = (e: PointerEvent) => renderer.setPointer(local(e))
    const onLeave = () => renderer.setPointer(null)
    const onDown = (e: PointerEvent) => renderer.pulse(local(e))
    const pointer = interactive && !reduced
    if (pointer) {
      host.addEventListener('pointermove', onMove)
      host.addEventListener('pointerleave', onLeave)
      host.addEventListener('pointerdown', onDown)
    }

    const onContextLost = (e: Event) => {
      e.preventDefault()
      renderer.stop()
      setGl('off')
    }
    canvas.addEventListener('webglcontextlost', onContextLost)

    // Glyphs are vector data, but the transparent text still uses the display
    // font; wait for it so the line boxes (and so the SVG positions) are final.
    const cs = getComputedStyle(host)
    const fontLoad = document.fonts
      ? document.fonts.load(`${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`, textKey)
      : Promise.resolve()
    Promise.race([fontLoad, new Promise((r) => setTimeout(r, FONT_TIMEOUT_MS))])
      .catch(() => undefined)
      .then(() => {
        if (disposed) return
        layout()
        ready = true
        setGl('on')
        sync()
      })

    return () => {
      disposed = true
      window.clearTimeout(resizeTimer)
      io.disconnect()
      ro.disconnect()
      window.removeEventListener('resize', onResize)
      document.removeEventListener('visibilitychange', sync)
      if (pointer) {
        host.removeEventListener('pointermove', onMove)
        host.removeEventListener('pointerleave', onLeave)
        host.removeEventListener('pointerdown', onDown)
      }
      canvas.removeEventListener('webglcontextlost', onContextLost)
      renderer.dispose()
    }
  }, [textKey, variant, energy, intro, stagger, animate, interactive])

  return createElement(
    as,
    {
      ref: hostRef,
      id,
      className: `etu-title${intro ? ' etu-title--intro' : ''}${className ? ` ${className}` : ''}`,
      style,
      'data-gl': gl,
      'data-variant': variant,
    },
    lines.map((line, i) => {
      const words = line.split(/\s+/).filter(Boolean)
      return (
        <span key={i} className="etu-title__line">
          {words.map((word, j) => {
            const { width } = layoutRun(word)
            return (
              <Fragment key={j}>
                <span className="etu-title__word">
                  <svg
                    data-etu-word={word}
                    className="etu-title__glyphs"
                    viewBox={`0 0 ${width} 1`}
                    style={{ width: `${width * ETU_CAP_EM}em`, height: `${ETU_CAP_EM}em` }}
                    aria-hidden="true"
                    focusable="false"
                  >
                    {i === 0 && j === 0 ? (
                      <defs>
                        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0" style={{ stopColor: 'var(--etu-title-fill-top)' }} />
                          <stop offset="0.5" style={{ stopColor: 'var(--etu-title-fill-mid)' }} />
                          <stop offset="1" style={{ stopColor: 'var(--etu-title-fill-bottom)' }} />
                        </linearGradient>
                      </defs>
                    ) : null}
                    <path d={runPathData(word)} fill={`url(#${gradId})`} />
                  </svg>
                  <span className="etu-title__text">{word}</span>
                </span>
                {j < words.length - 1 ? ' ' : null}
              </Fragment>
            )
          })}
        </span>
      )
    }),
    <canvas key="canvas" ref={canvasRef} className="etu-title__canvas" aria-hidden="true" />,
  )
}
