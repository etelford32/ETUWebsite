/**
 * The ETU 2175 title alphabet as vector data.
 *
 * Squared block capitals with 45° chamfered corners and rectangular
 * counters, drawn from public/brand/etu-title-typography.webp. Units are
 * cap heights: y runs down from the cap line (0) to the baseline (1).
 * Contours fill with the nonzero rule — outlines wind one way, counters
 * the other — so overlapping strokes simply union.
 */

export type Pt = readonly [number, number]
export type Contour = readonly Pt[]

export interface EtuGlyph {
  char: string
  /** Advance width (without tracking), cap-height units. */
  width: number
  contours: readonly Contour[]
}

/** Vertical / horizontal stroke weights and corner cuts. */
const SV = 0.25
const SH = 0.21
const K = 0.13
const k = 0.05
const MID0 = 0.5 - SH / 2
const MID1 = 0.5 + SH / 2

/** Space between letters, cap-height units. */
export const ETU_TRACKING = 0.12
/** Cap height as a fraction of the font size (em). */
export const ETU_CAP_EM = 0.74

type Corners = { tl?: number; tr?: number; br?: number; bl?: number }
const all = (c: number): Corners => ({ tl: c, tr: c, br: c, bl: c })

function box(x0: number, y0: number, x1: number, y1: number, c: Corners = {}): Pt[] {
  const p: Pt[] = []
  if (c.tl) p.push([x0, y0 + c.tl], [x0 + c.tl, y0])
  else p.push([x0, y0])
  if (c.tr) p.push([x1 - c.tr, y0], [x1, y0 + c.tr])
  else p.push([x1, y0])
  if (c.br) p.push([x1, y1 - c.br], [x1 - c.br, y1])
  else p.push([x1, y1])
  if (c.bl) p.push([x0 + c.bl, y1], [x0, y1 - c.bl])
  else p.push([x0, y1])
  return p
}

/** Diagonal stroke between two centre points with horizontal end caps. */
function slant(cxTop: number, cxBot: number, y0: number, y1: number, stroke = SV): Pt[] {
  const dy = y1 - y0
  const hw = (stroke * Math.hypot(cxBot - cxTop, dy)) / dy
  return [
    [cxTop - hw / 2, y0],
    [cxTop + hw / 2, y0],
    [cxBot + hw / 2, y1],
    [cxBot - hw / 2, y1],
  ]
}

const area = (c: readonly Pt[]) => {
  let a = 0
  for (let i = 0; i < c.length; i++) {
    const [x0, y0] = c[i]
    const [x1, y1] = c[(i + 1) % c.length]
    a += x0 * y1 - x1 * y0
  }
  return a / 2
}

const wind = (c: Pt[], sign: 1 | -1): Contour => (Math.sign(area(c)) === sign ? c : [...c].reverse())

function glyph(char: string, width: number, outer: Pt[][], holes: Pt[][] = []): EtuGlyph {
  return {
    char,
    width,
    contours: [...outer.map((c) => wind(c, 1)), ...holes.map((c) => wind(c, -1))],
  }
}

function rot180(g: EtuGlyph, char: string): EtuGlyph {
  return {
    char,
    width: g.width,
    contours: g.contours.map((c) => c.map(([x, y]) => [g.width - x, 1 - y] as Pt)),
  }
}

function ring(w: number, outer: Corners, inner: Corners): [Pt[][], Pt[][]] {
  return [[box(0, 0, w, 1, outer)], [box(SV, SH, w - SV, 1 - SH, inner)]]
}

const defs: EtuGlyph[] = []
const def = (g: EtuGlyph) => defs.push(g)

// ---------------------------------------------------------------- letters
{
  const w = 0.94
  def(glyph('A', w, [
    box(0.2, 0, w - 0.2, SH, { tl: k, tr: k }),
    slant(0.33, 0.14, 0, 1),
    slant(w - 0.33, w - 0.14, 0, 1),
    box(0.12, 0.6, w - 0.12, 0.6 + SH),
  ]))
}
{
  const w = 0.88
  def(glyph('B', w, [[
    [0, 0], [w - K, 0], [w, K], [w, 0.45], [w - 0.05, 0.5], [w, 0.55], [w, 1 - K], [w - K, 1], [0, 1],
  ]], [box(SV, SH, w - SV, MID0, { tr: k }), box(SV, MID1, w - SV, 1 - SH, { br: k })]))
}
{
  const w = 0.86
  def(glyph('C', w, [box(0, 0, w, SH, { tl: K }), box(0, 0, SV, 1, { tl: K, bl: K }), box(0, 1 - SH, w, 1, { bl: K })]))
}
{
  const w = 0.88
  def(glyph('D', w, [box(0, 0, w, 1, { tr: 0.22, br: 0.22 })], [box(SV, SH, w - SV, 1 - SH, { tr: 0.09, br: 0.09 })]))
}
{
  const w = 0.8
  def(glyph('E', w, [
    box(0, 0, SV, 1, { tl: K, bl: K }),
    box(0, 0, w, SH, { tl: K }),
    box(0, MID0, w - 0.07, MID1),
    box(0, 1 - SH, w, 1, { bl: K }),
  ]))
}
{
  const w = 0.78
  def(glyph('F', w, [box(0, 0, SV, 1, { tl: K }), box(0, 0, w, SH, { tl: K }), box(0, MID0, w - 0.08, MID1)]))
}
{
  const w = 0.88
  def(glyph('G', w, [
    box(0, 0, w, SH, { tl: K }),
    box(0, 0, SV, 1, { tl: K, bl: K }),
    box(0, 1 - SH, w, 1, { bl: K, br: K }),
    box(w - SV, 0.47, w, 1, { br: K }),
    box(w * 0.45, 0.47, w, 0.47 + SH),
  ]))
}
{
  const w = 0.88
  def(glyph('H', w, [box(0, 0, SV, 1), box(w - SV, 0, w, 1), box(0, MID0, w, MID1)]))
}
def(glyph('I', 0.27, [box(0, 0, 0.27, 1)]))
{
  const w = 0.84
  def(glyph('J', w, [box(w - SV, 0, w, 1, { br: K }), box(0, 1 - SH, w, 1, { bl: K, br: K }), box(0, 0.55, SV, 1, { bl: K })]))
}
{
  const w = 0.9
  def(glyph('K', w, [
    box(0, 0, SV, 1),
    slant(w - 0.15, SV + 0.02, 0, 0.62),
    slant(SV + 0.12, w - 0.15, 0.4, 1),
  ]))
}
{
  const w = 0.78
  def(glyph('L', w, [box(0, 0, SV, 1, { bl: K }), box(0, 1 - SH, w, 1, { bl: K })]))
}
{
  const w = 1.06
  def(glyph('M', w, [
    box(0, 0, SV, 1, { tl: k }),
    box(w - SV, 0, w, 1, { tr: k }),
    slant(SV / 2 + 0.03, w / 2, 0, 0.68),
    slant(w - SV / 2 - 0.03, w / 2, 0, 0.68),
  ]))
}
{
  const w = 0.92
  def(glyph('N', w, [box(0, 0, SV, 1), box(w - SV, 0, w, 1), slant(SV / 2 + 0.03, w - SV / 2 - 0.03, 0, 1)]))
}
{
  const [o, h] = ring(0.9, all(K), all(k))
  def(glyph('O', 0.9, o, h))
}
{
  const w = 0.86
  def(glyph('P', w, [box(0, 0, w, 0.64, { tr: K, br: 0.09 }), box(0, 0, SV, 1)], [box(SV, SH, w - SV, 0.64 - SH, { tr: k, br: k })]))
}
{
  const w = 0.9
  const [o, h] = ring(w, all(K), all(k))
  def(glyph('Q', w, [...o, slant(w * 0.6, w - 0.06, 0.6, 1.08, SV * 0.92)], h))
}
{
  const w = 0.88
  def(glyph('R', w, [
    box(0, 0, w, 0.6, { tr: K, br: 0.09 }),
    box(0, 0, SV, 1),
    slant(w * 0.5, w - SV / 2 - 0.02, 0.5, 1),
  ], [box(SV, SH, w - SV, 0.6 - SH, { tr: k, br: k })]))
}
{
  const w = 0.86
  def(glyph('S', w, [
    box(0, 0, w, SH, { tl: K }),
    box(0, 0, SV, MID1, { tl: K }),
    box(0, MID0, w, MID1),
    box(w - SV, MID0, w, 1, { br: K }),
    box(0, 1 - SH, w, 1, { br: K }),
  ]))
}
{
  const w = 0.86
  def(glyph('T', w, [box(0, 0, w, SH), box(w / 2 - SV / 2, 0, w / 2 + SV / 2, 1)]))
}
{
  const w = 0.88
  def(glyph('U', w, [box(0, 0, SV, 1, { bl: K }), box(w - SV, 0, w, 1, { br: K }), box(0, 1 - SH, w, 1, { bl: K, br: K })]))
}
{
  const w = 0.94
  def(glyph('V', w, [slant(SV / 2 + 0.03, w / 2, 0, 1), slant(w - SV / 2 - 0.03, w / 2, 0, 1)]))
}
{
  const w = 1.24
  def(glyph('W', w, [
    slant(0.15, 0.34, 0, 1),
    slant(w / 2, 0.34, 0.3, 1),
    slant(w / 2, w - 0.34, 0.3, 1),
    slant(w - 0.15, w - 0.34, 0, 1),
  ]))
}
{
  const w = 0.92
  def(glyph('X', w, [slant(SV / 2 + 0.03, w - SV / 2 - 0.03, 0, 1), slant(w - SV / 2 - 0.03, SV / 2 + 0.03, 0, 1)]))
}
{
  const w = 0.92
  def(glyph('Y', w, [
    slant(SV / 2 + 0.03, w / 2, 0, 0.56),
    slant(w - SV / 2 - 0.03, w / 2, 0, 0.56),
    box(w / 2 - SV / 2, 0.5, w / 2 + SV / 2, 1),
  ]))
}
{
  const w = 0.86
  def(glyph('Z', w, [box(0, 0, w, SH, { tl: k }), box(0, 1 - SH, w, 1, { br: k }), slant(w - SV / 2 - 0.02, SV / 2 + 0.02, SH / 2, 1 - SH / 2)]))
}

// ----------------------------------------------------------------- digits
{
  const w = 0.8
  const [o, h] = ring(w, all(K), all(k))
  def(glyph('0', w, [...o, slant(w - SV - 0.05, SV + 0.05, SH, 1 - SH, SV * 0.55)], h))
}
def(glyph('1', 0.56, [box(0.56 - SV, 0, 0.56, 1), box(0.04, 0, 0.56, SH, { tl: K })]))
{
  const w = 0.8
  def(glyph('2', w, [
    box(0, 0, w, SH, { tr: K }),
    box(w - SV, 0, w, MID1, { tr: K }),
    box(0, MID0, w, MID1),
    box(0, MID0, SV, 1, { bl: k }),
    box(0, 1 - SH, w, 1, { bl: k }),
  ]))
}
{
  const w = 0.8
  def(glyph('3', w, [
    box(0, 0, w, SH, { tr: K }),
    box(w * 0.22, MID0, w, MID1),
    box(0, 1 - SH, w, 1, { br: K }),
    box(w - SV, 0, w, 1, { tr: K, br: K }),
  ]))
}
{
  const w = 0.82
  def(glyph('4', w, [box(0, 0, SV, 0.64), box(0, 0.64 - SH, w, 0.64), box(w - SV, 0, w, 1)]))
}
{
  const w = 0.8
  def(glyph('5', w, [
    box(0, 0, w, SH),
    box(0, 0, SV, MID1),
    box(0, MID0, w, MID1),
    box(w - SV, MID0, w, 1, { br: K }),
    box(0, 1 - SH, w, 1, { br: K }),
  ]))
}
{
  const w = 0.8
  def(glyph('6', w, [
    box(0, 0, SV, 1, { tl: K, bl: K }),
    box(0, 0, w, SH, { tl: K }),
    box(0, MID0, w, MID1),
    box(w - SV, MID0, w, 1, { br: K }),
    box(0, 1 - SH, w, 1, { bl: K, br: K }),
  ]))
}
{
  const w = 0.8
  def(glyph('7', w, [box(0, 0, w, SH), slant(w - SV / 2 - 0.01, 0.3, SH / 2, 1)]))
}
{
  const w = 0.8
  def(glyph('8', w, [box(0, 0, w, 1, all(K))], [box(SV, SH, w - SV, MID0, all(k)), box(SV, MID1, w - SV, 1 - SH, all(k))]))
}

// ------------------------------------------------------------ punctuation
def(glyph(' ', 0.38, []))
def(glyph('.', SV, [box(0, 1 - SH, SV, 1)]))
def(glyph(',', SV, [box(0, 1 - SH, SV, 1), box(0, 1, SV * 0.55, 1.13)]))
def(glyph('-', 0.5, [box(0, MID0, 0.5, MID1)]))
def(glyph(':', SV, [box(0, 0.2, SV, 0.2 + SH), box(0, 1 - SH, SV, 1)]))
def(glyph('!', SV, [box(0, 0, SV, 0.66), box(0, 1 - SH, SV, 1)]))
def(glyph("'", SV * 0.8, [box(0, 0, SV * 0.8, 0.32)]))
def(glyph('/', 0.62, [slant(0.62 - SV / 2, SV / 2, 0, 1)]))
def(glyph('+', 0.7, [box(0.35 - SH / 2, 0.2, 0.35 + SH / 2, 0.8), box(0, MID0, 0.7, MID1)]))
def(glyph('·', SV, [box(0, MID0, SV, MID1)]))
{
  const w = 0.8
  const x = w * 0.35
  def(glyph('?', w, [
    box(0, 0, w, SH, { tl: K }),
    box(w - SV, 0, w, 0.58, { tr: K }),
    box(x, 0.58 - SH, w, 0.58),
    box(x, 0.58 - SH, x + SV, 0.72),
    box(x, 1 - SH, x + SV, 1),
  ]))
}

const TABLE: Record<string, EtuGlyph> = Object.fromEntries(defs.map((g) => [g.char, g]))
TABLE['9'] = rot180(TABLE['6'], '9')
TABLE['•'] = TABLE['·']
TABLE['–'] = TABLE['-']
TABLE['—'] = TABLE['-']
TABLE['’'] = TABLE["'"]

export const ETU_GLYPHS: Readonly<Record<string, EtuGlyph>> = TABLE

/** Glyph for a character; lowercase maps to caps, unknowns to `?`. */
export function getGlyph(ch: string): EtuGlyph {
  return TABLE[ch] ?? TABLE[ch.toUpperCase()] ?? TABLE['?']
}

export interface PlacedGlyph {
  glyph: EtuGlyph
  /** Left edge, cap-height units from the start of the run. */
  x: number
}

/** Lay out a run of text (no wrapping). Width excludes trailing tracking. */
export function layoutRun(text: string): { glyphs: PlacedGlyph[]; width: number } {
  const glyphs: PlacedGlyph[] = []
  let x = 0
  for (const ch of text) {
    const glyph = getGlyph(ch)
    glyphs.push({ glyph, x })
    x += glyph.width + ETU_TRACKING
  }
  return { glyphs, width: Math.max(0, x - ETU_TRACKING) }
}

const fmt = (n: number) => +n.toFixed(4)

/** SVG path data for a run, in cap-height units. */
export function runPathData(text: string): string {
  return layoutRun(text)
    .glyphs.flatMap(({ glyph, x }) =>
      glyph.contours.map((c) => `M${c.map(([px, py]) => `${fmt(px + x)} ${fmt(py)}`).join('L')}Z`),
    )
    .join('')
}

/** Append a glyph's outlines to a canvas path at (x, y) top-left, `cap` px tall. */
export function traceGlyph(
  ctx: CanvasRenderingContext2D,
  glyph: EtuGlyph,
  x: number,
  y: number,
  cap: number,
) {
  for (const c of glyph.contours) {
    c.forEach(([px, py], i) => {
      const X = x + px * cap
      const Y = y + py * cap
      if (i === 0) ctx.moveTo(X, Y)
      else ctx.lineTo(X, Y)
    })
    ctx.closePath()
  }
}
