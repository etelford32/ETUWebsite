'use client'

import { createElement, Fragment, useEffect, useRef, useState, type CSSProperties } from 'react'
import { EtuTitleRenderer, type EtuTitleVariant, type GlyphRun } from '@/lib/etuTitle'

type TitleTag = 'h1' | 'h2' | 'h3' | 'h4' | 'p' | 'div' | 'span'

export interface EtuTitleProps {
  /** One string per line. Words inside a line wrap naturally. */
  text: string | string[]
  as?: TitleTag
  /** Energy colour; `cyan` is the official treatment. */
  variant?: EtuTitleVariant
  /** Glow intensity override (preset default is ~1). */
  energy?: number
  /** Assemble the tiles left-to-right the first time the title is seen. */
  intro?: boolean
  introDuration?: number
  /** Ambient pulses, sparkles and breathing glow after the intro. */
  animate?: boolean
  /** Cursor charges nearby crystal tiles. */
  interactive?: boolean
  className?: string
  style?: CSSProperties
  id?: string
}

type GlState = 'pending' | 'on' | 'off'

const MAX_DPR = 2
const MAX_PIXELS = 4_000_000
/** Canvas bleed around the text for extrusion, halo and sparkles, × font size. */
const BLEED = 0.5
const FONT_TIMEOUT_MS = 3000

/**
 * ETU 2175 title typography. The text stays real DOM text (selectable,
 * indexable, read by screen readers, and styled as a CSS fallback); a
 * WebGL canvas laid over it draws the official tiled-metal treatment.
 * Size it with font-size utilities like any heading.
 */
export default function EtuTitle({
  text,
  as = 'h2',
  variant = 'cyan',
  energy,
  intro = true,
  introDuration,
  animate = true,
  interactive = true,
  className = '',
  style,
  id,
}: EtuTitleProps) {
  const hostRef = useRef<HTMLElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [gl, setGl] = useState<GlState>('pending')

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
          introDuration,
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
      const words = Array.from(host.querySelectorAll<HTMLElement>('[data-etu-word]'))
      if (!words.length) return
      const hostRect = host.getBoundingClientRect()
      const styles = words.map((w) => getComputedStyle(w))
      const fontSize = Math.max(...styles.map((cs) => parseFloat(cs.fontSize) || 16))
      const bleed = Math.ceil(fontSize * BLEED)
      // Never bleed sideways past the viewport: it would add a horizontal scrollbar.
      const vw = document.documentElement.clientWidth
      const left = Math.min(bleed, Math.max(0, Math.floor(hostRect.left)))
      const right = Math.min(bleed, Math.max(0, Math.floor(vw - hostRect.right)))
      const width = hostRect.width + left + right
      const height = hostRect.height + bleed * 2

      let dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR)
      if (width * height * dpr * dpr > MAX_PIXELS) dpr = Math.sqrt(MAX_PIXELS / (width * height))

      const runs: GlyphRun[] = words.map((w, i) => {
        const cs = styles[i]
        const r = w.getBoundingClientRect()
        const raw = w.textContent ?? ''
        return {
          text: cs.textTransform === 'uppercase' ? raw.toUpperCase() : raw,
          x: r.left - hostRect.left + left,
          top: r.top - hostRect.top + bleed,
          fontFamily: cs.fontFamily,
          fontWeight: cs.fontWeight,
          fontStyle: cs.fontStyle,
          fontSize: parseFloat(cs.fontSize) || 16,
          letterSpacing: parseFloat(cs.letterSpacing) || 0,
        }
      })

      canvas.style.left = `${-left}px`
      canvas.style.top = `${-bleed}px`
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      renderer.setLayout({ width, height, dpr, runs })
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

    const onMove = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect()
      renderer.setPointer({ x: e.clientX - r.left, y: e.clientY - r.top })
    }
    const onLeave = () => renderer.setPointer(null)
    const pointer = interactive && !reduced
    if (pointer) {
      host.addEventListener('pointermove', onMove)
      host.addEventListener('pointerleave', onLeave)
    }

    const onContextLost = (e: Event) => {
      e.preventDefault()
      renderer.stop()
      setGl('off')
    }
    canvas.addEventListener('webglcontextlost', onContextLost)

    // The mask must be drawn with the real typeface, so wait for it.
    const first = host.querySelector<HTMLElement>('[data-etu-word]')
    const cs = first ? getComputedStyle(first) : null
    const fontLoad = cs && document.fonts
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
      }
      canvas.removeEventListener('webglcontextlost', onContextLost)
      renderer.dispose()
    }
  }, [textKey, variant, energy, intro, introDuration, animate, interactive])

  return createElement(
    as,
    {
      ref: hostRef,
      id,
      className: `etu-title${intro ? ' etu-title--intro' : ''}${className ? ` ${className}` : ''}`,
      style,
      'data-gl': gl,
    },
    lines.map((line, i) => {
      const words = line.split(/\s+/).filter(Boolean)
      return (
        <span key={i} className="etu-title__line">
          {words.map((word, j) => (
            <Fragment key={j}>
              <span data-etu-word="" className="etu-title__word">
                {word}
              </span>
              {j < words.length - 1 ? ' ' : null}
            </Fragment>
          ))}
        </span>
      )
    }),
    <canvas key="canvas" ref={canvasRef} className="etu-title__canvas" aria-hidden="true" />,
  )
}
