/**
 * Glyph atlas for the title renderer. Each distinct (glyph, size) gets a
 * padded cell holding three channels the shader reads:
 *   R = coverage (anti-aliased)
 *   G = distance inside the outline / inMax  (chamfer, panel groove)
 *   B = distance outside the outline / outMax (halo, sparkle field)
 * Distances come from an exact Euclidean distance transform
 * (Felzenszwalb & Huttenlocher), seeded with sub-pixel coverage.
 */

import { traceGlyph, type EtuGlyph } from './glyphs'

export interface AtlasCell {
  /** Top-left in the atlas, px. */
  x: number
  y: number
  /** Cell size, px. */
  w: number
  h: number
  /** Glyph origin (cap line, left edge) inside the cell, px. */
  pad: number
  cap: number
}

export interface GlyphAtlas {
  data: Uint8Array
  width: number
  height: number
  cells: Map<string, AtlasCell>
  /** Distances encoded at full scale, px. */
  inMax: number
  outMax: number
}

/** Cell padding around a glyph (extrusion, halo, sparkles), × cap height. */
export const CELL_PAD = 0.55
/** Inside distance range encoded, × cap height. */
const IN_RANGE = 0.3
/** Room below the baseline for Q's tail and commas, × cap height. */
const DESCENT = 0.15
const GUTTER = 2
const INF = 1e20

export const cellKey = (glyph: EtuGlyph, cap: number) => `${glyph.char}@${Math.round(cap)}`

function edt1d(
  grid: Float64Array, offset: number, stride: number, length: number,
  f: Float64Array, v: Uint16Array, z: Float64Array,
) {
  v[0] = 0
  z[0] = -INF
  z[1] = INF
  f[0] = grid[offset]
  for (let q = 1, k = 0, s = 0; q < length; q++) {
    f[q] = grid[offset + q * stride]
    const q2 = q * q
    do {
      const r = v[k]
      s = (f[q] - f[r] + q2 - r * r) / (q - r) / 2
    } while (s <= z[k] && --k > -1)
    k++
    v[k] = q
    z[k] = s
    z[k + 1] = INF
  }
  for (let q = 0, k = 0; q < length; q++) {
    while (z[k + 1] < q) k++
    const r = v[k]
    const qr = q - r
    grid[offset + q * stride] = f[r] + qr * qr
  }
}

/** In-place squared distance transform of a w×h grid. */
function edt(grid: Float64Array, w: number, h: number) {
  const n = Math.max(w, h)
  const f = new Float64Array(n)
  const v = new Uint16Array(n)
  const z = new Float64Array(n + 1)
  for (let x = 0; x < w; x++) edt1d(grid, x, w, h, f, v, z)
  for (let y = 0; y < h; y++) edt1d(grid, y * w, 1, w, f, v, z)
}

function rasterize(
  ctx: CanvasRenderingContext2D, glyph: EtuGlyph, cell: AtlasCell,
  out: Uint8Array, atlasW: number, inMax: number, outMax: number,
) {
  const { w, h, pad, cap } = cell
  ctx.clearRect(0, 0, w, h)
  ctx.fillStyle = '#fff'
  ctx.beginPath()
  traceGlyph(ctx, glyph, pad, pad, cap)
  ctx.fill('nonzero')
  const alpha = ctx.getImageData(0, 0, w, h).data

  const outer = new Float64Array(w * h)
  const inner = new Float64Array(w * h)
  for (let i = 0; i < w * h; i++) {
    const a = alpha[i * 4 + 3] / 255
    if (a >= 1) {
      outer[i] = 0
      inner[i] = INF
    } else if (a <= 0) {
      outer[i] = INF
      inner[i] = 0
    } else {
      const d = 0.5 - a
      outer[i] = d > 0 ? d * d : 0
      inner[i] = d < 0 ? d * d : 0
    }
  }
  edt(outer, w, h)
  edt(inner, w, h)

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x
      const sd = Math.sqrt(outer[i]) - Math.sqrt(inner[i]) // + outside
      const o = ((cell.y + y) * atlasW + cell.x + x) * 4
      out[o] = alpha[i * 4 + 3]
      out[o + 1] = Math.round(Math.min(Math.max(-sd, 0) / inMax, 1) * 255)
      out[o + 2] = Math.round(Math.min(Math.max(sd, 0) / outMax, 1) * 255)
      out[o + 3] = 255
    }
  }
}

/**
 * Build one atlas for every distinct glyph/size pair. Sizes are device px.
 * Returns null if 2D canvas is unavailable or the atlas would not fit.
 */
export function buildAtlas(
  entries: { glyph: EtuGlyph; cap: number }[],
  maxSize: number,
): GlyphAtlas | null {
  const unique = new Map<string, { glyph: EtuGlyph; cap: number }>()
  for (const e of entries) unique.set(cellKey(e.glyph, e.cap), e)
  if (!unique.size) return null

  const capMax = Math.max(...Array.from(unique.values(), (e) => e.cap))
  const inMax = capMax * IN_RANGE
  const outMax = capMax * CELL_PAD

  // Shelf packing, one row per line of cells.
  const cells = new Map<string, AtlasCell>()
  const rowLimit = Math.min(maxSize, 4096)
  let x = 0
  let y = 0
  let rowH = 0
  let width = 0
  for (const [key, { glyph, cap }] of unique) {
    const pad = Math.ceil(cap * CELL_PAD)
    const w = Math.ceil(glyph.width * cap) + pad * 2
    const h = Math.ceil(cap * (1 + DESCENT)) + pad * 2
    if (x + w > rowLimit && x > 0) {
      x = 0
      y += rowH + GUTTER
      rowH = 0
    }
    cells.set(key, { x, y, w, h, pad, cap })
    x += w + GUTTER
    rowH = Math.max(rowH, h)
    width = Math.max(width, x)
  }
  const height = y + rowH
  if (width > maxSize || height > maxSize) return null

  const scratch = document.createElement('canvas')
  scratch.width = Math.max(...Array.from(cells.values(), (c) => c.w))
  scratch.height = Math.max(...Array.from(cells.values(), (c) => c.h))
  const ctx = scratch.getContext('2d', { willReadFrequently: true })
  if (!ctx) return null

  const data = new Uint8Array(width * height * 4)
  // Empty texels read as "far outside".
  for (let i = 2; i < data.length; i += 4) data[i] = 255
  for (const [key, { glyph }] of unique) {
    rasterize(ctx, glyph, cells.get(key)!, data, width, inMax, outMax)
  }
  return { data, width, height, cells, inMax, outMax }
}
