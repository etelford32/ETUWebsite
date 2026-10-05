/**
 * Builds the RGB glyph mask the title shader samples (see shaders.ts).
 * All coordinates are CSS px relative to the canvas origin; the mask is
 * rasterised at `dpr` and returned as raw RGBA bytes for texImage2D.
 */

export interface GlyphRun {
  text: string
  /** Left edge of the run, CSS px from the canvas origin. */
  x: number
  /** Top of the run's line box (DOM content area), CSS px. */
  top: number
  fontFamily: string
  fontWeight: string
  fontStyle: string
  /** CSS px. */
  fontSize: number
  letterSpacing: number
}

export interface GlyphLayout {
  /** Canvas size in CSS px. */
  width: number
  height: number
  dpr: number
  runs: GlyphRun[]
}

export interface GlyphMask {
  data: Uint8Array
  width: number
  height: number
  /** Glyph bounds in device px: minX, minY, maxX, maxY. */
  textBox: [number, number, number, number]
  /** Largest font size in device px — drives tile, bevel and depth scale. */
  fontPx: number
}

// Blur radii as a fraction of the font size.
const BEVEL_BLUR = 0.045
const HALO_BLUR = 0.32
const SHADOW_SHIFT = 100000

function drawRuns(
  ctx: CanvasRenderingContext2D,
  layout: GlyphLayout,
  shiftX: number,
) {
  const { dpr } = layout
  ctx.fillStyle = '#fff'
  ctx.textBaseline = 'alphabetic'
  // ctx.letterSpacing keeps kerning; older Safari/Firefox lack it.
  const spaced = ctx as CanvasRenderingContext2D & { letterSpacing?: string }
  const supportsSpacing = typeof spaced.letterSpacing === 'string'

  for (const run of layout.runs) {
    ctx.font = `${run.fontStyle} ${run.fontWeight} ${run.fontSize * dpr}px ${run.fontFamily}`
    const metrics = ctx.measureText(run.text)
    // Match the DOM baseline: content-area top + font ascent.
    const ascent = metrics.fontBoundingBoxAscent ?? run.fontSize * dpr * 0.8
    const y = run.top * dpr + ascent
    let x = run.x * dpr + shiftX
    const spacing = run.letterSpacing * dpr

    if (supportsSpacing) {
      spaced.letterSpacing = `${spacing}px`
      ctx.fillText(run.text, x, y)
    } else {
      for (const ch of run.text) {
        ctx.fillText(ch, x, y)
        x += ctx.measureText(ch).width + spacing
      }
    }
  }
}

function alphaPass(
  ctx: CanvasRenderingContext2D,
  layout: GlyphLayout,
  w: number,
  h: number,
  blurPx: number,
): Uint8ClampedArray {
  ctx.clearRect(0, 0, w, h)
  ctx.save()
  if (blurPx > 0) {
    // Draw the glyphs far off-canvas and keep only their shadow: shadowBlur
    // works everywhere, unlike ctx.filter (missing in Safari).
    ctx.shadowColor = '#fff'
    ctx.shadowBlur = blurPx
    ctx.shadowOffsetX = SHADOW_SHIFT
    drawRuns(ctx, layout, -SHADOW_SHIFT)
  } else {
    drawRuns(ctx, layout, 0)
  }
  ctx.restore()
  return ctx.getImageData(0, 0, w, h).data
}

export function buildGlyphMask(layout: GlyphLayout): GlyphMask | null {
  const w = Math.max(1, Math.round(layout.width * layout.dpr))
  const h = Math.max(1, Math.round(layout.height * layout.dpr))
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return null

  const fontPx = Math.max(...layout.runs.map((r) => r.fontSize), 1) * layout.dpr

  const sharp = alphaPass(ctx, layout, w, h, 0)
  const bevel = alphaPass(ctx, layout, w, h, fontPx * BEVEL_BLUR)
  const halo = alphaPass(ctx, layout, w, h, fontPx * HALO_BLUR)

  const data = new Uint8Array(w * h * 4)
  let minX = w, minY = h, maxX = 0, maxY = 0
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    const a = sharp[i + 3]
    data[i] = a
    // Boost the halo so its falloff reaches well past the glyph edge.
    data[i + 1] = bevel[i + 3]
    data[i + 2] = Math.min(255, halo[i + 3] * 1.8)
    data[i + 3] = 255
    if (a > 127) {
      const x = p % w
      const y = (p - x) / w
      if (x < minX) minX = x
      if (x > maxX) maxX = x
      if (y < minY) minY = y
      if (y > maxY) maxY = y
    }
  }
  if (maxX < minX) {
    minX = 0; minY = 0; maxX = w; maxY = h
  }

  return { data, width: w, height: h, textBox: [minX, minY, maxX, maxY], fontPx }
}
