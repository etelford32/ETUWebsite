/**
 * Animation objects for the title renderer: a damped spring and one
 * GlyphActor per rendered letter. Actors carry everything the shader
 * needs per letter (transform, reveal, flash, charge, glint) and expose
 * small verbs — drop in, kick, glint — that choreographies combine.
 */

import type { EtuGlyph } from './glyphs'
import type { AtlasCell } from './atlas'

export class Spring {
  value: number
  target: number
  velocity = 0

  /** `damping` is the damping ratio: < 1 overshoots, 1 is critical. */
  constructor(value: number, public stiffness = 140, public damping = 0.55) {
    this.value = value
    this.target = value
  }

  step(dt: number) {
    const c = 2 * Math.sqrt(this.stiffness) * this.damping
    const a = this.stiffness * (this.target - this.value) - c * this.velocity
    this.velocity += a * dt
    this.value += this.velocity * dt
  }

  snap(v: number) {
    this.value = v
    this.target = v
    this.velocity = 0
  }

  get atRest() {
    return Math.abs(this.target - this.value) < 1e-3 && Math.abs(this.velocity) < 1e-2
  }
}

export interface GlyphPlacement {
  glyph: EtuGlyph
  /** Glyph origin (left edge on the cap line), device px. */
  x: number
  y: number
  /** Cap height, device px. */
  cap: number
}

const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(Math.max((x - a) / (b - a), 0), 1)
  return t * t * (3 - 2 * t)
}

/** Seconds from an actor's intro start to its full tile lock-in. */
const LOCK_TIME = 0.95
/** When the falling letter lands and flashes. */
const LAND_TIME = 0.34
export const REVEAL_DONE = 1.4

export class GlyphActor {
  readonly glyph: EtuGlyph
  readonly index: number
  cap = 0
  cell!: AtlasCell
  /** Cell top-left at rest, canvas px. */
  origin = { x: 0, y: 0 }
  center = { x: 0, y: 0 }
  extrudeDir: [number, number] = [0, 1]

  offsetX = new Spring(0, 120, 0.5)
  offsetY = new Spring(0, 120, 0.5)
  rot = new Spring(0, 90, 0.45)
  zoom = new Spring(1, 140, 0.5)
  charge = new Spring(0, 60, 0.9)

  opacity = 1
  reveal = REVEAL_DONE
  flash = 0
  glint = { x: 0, y: 0, s: 0 }
  pointer = { x: 0, y: 0, s: 0 }

  private introAt = -1
  private landed = true
  private pulseAt = -1

  constructor(placement: GlyphPlacement, cell: AtlasCell, index: number) {
    this.glyph = placement.glyph
    this.index = index
    this.relocate(placement, cell)
  }

  /** Move the rest position (resize / reflow) without touching animation state. */
  relocate(placement: GlyphPlacement, cell: AtlasCell) {
    this.cap = placement.cap
    this.cell = cell
    this.origin = { x: placement.x - cell.pad, y: placement.y - cell.pad }
    this.center = { x: this.origin.x + cell.w / 2, y: this.origin.y + cell.pad + placement.cap / 2 }
  }

  get introducing() {
    return this.introAt >= 0
  }

  /** Fall in from above, tumbling, and lock tiles in place from `at` (s). */
  dropIn(at: number) {
    const cap = this.cap
    this.introAt = at
    this.landed = false
    this.opacity = 0
    this.reveal = 0
    this.offsetX.snap((Math.random() - 0.5) * 0.25 * cap)
    this.offsetY.snap(-0.55 * cap)
    this.rot.snap((Math.random() - 0.5) * 0.35)
    this.zoom.snap(1.3)
  }

  /** Jump straight to the settled pose. */
  settle() {
    this.introAt = -1
    this.landed = true
    this.opacity = 1
    this.reveal = REVEAL_DONE
    for (const s of [this.offsetX, this.offsetY, this.rot]) s.snap(0)
    this.zoom.snap(1)
  }

  /** Queue a shockwave hit at time `at` (s). */
  pulse(at: number) {
    this.pulseAt = at
  }

  /** Star glint on one of the glyph's corners. */
  sparkle(strength = 1) {
    const corners = this.glyph.contours.flat()
    if (!corners.length) return
    const [x, y] = corners[Math.floor(Math.random() * corners.length)]
    this.glint.x = this.cell.pad + x * this.cap
    this.glint.y = this.cell.pad + y * this.cap
    this.glint.s = strength
  }

  /** Hover: lift and charge by proximity (0..1); local pointer in cell px. */
  hover(proximity: number, local: { x: number; y: number } | null) {
    this.charge.target = proximity
    if (this.introducing) return
    this.offsetY.target = -0.07 * this.cap * proximity
    this.zoom.target = 1 + 0.04 * proximity
    if (local) {
      this.pointer.x = local.x
      this.pointer.y = local.y
    }
  }

  update(t: number, dt: number) {
    if (this.introAt >= 0) {
      const local = t - this.introAt
      if (local < 0) {
        this.opacity = 0
        this.reveal = 0
      } else {
        // release the springs from the drop pose
        this.offsetX.target = 0
        this.offsetY.target = 0
        this.rot.target = 0
        this.zoom.target = 1
        this.opacity = smoothstep(0, 0.22, local)
        const p = Math.min(local / LOCK_TIME, 1)
        this.reveal = (1 - (1 - p) * (1 - p)) * REVEAL_DONE
        if (!this.landed && local >= LAND_TIME) {
          this.landed = true
          this.flash = 1
          this.sparkle(0.9)
        }
        if (p >= 1) this.introAt = -1
      }
    }

    if (this.pulseAt >= 0 && t >= this.pulseAt) {
      this.pulseAt = -1
      this.flash = Math.max(this.flash, 0.75)
      this.offsetY.velocity -= this.cap * 1.6
      this.charge.velocity += 5
    }

    this.flash *= Math.exp(-dt * 4)
    this.glint.s *= Math.exp(-dt * 3)
    this.pointer.s += ((this.charge.target > 0.02 ? 1 : 0) - this.pointer.s) * Math.min(dt * 8, 1)
    for (const s of [this.offsetX, this.offsetY, this.rot, this.zoom, this.charge]) s.step(dt)
  }

  get calm() {
    return (
      this.introAt < 0 &&
      this.pulseAt < 0 &&
      this.flash < 0.01 &&
      this.glint.s < 0.01 &&
      this.offsetX.atRest && this.offsetY.atRest && this.rot.atRest && this.zoom.atRest && this.charge.atRest
    )
  }
}
