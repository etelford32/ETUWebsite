/**
 * Motion for ETU titles. Every rendered letter is a GlyphActor wrapping its
 * DOM element: springs for position, tilt and scale, plus `charge` (lights
 * the crystal layer) and `flash` (a brightness spike). TitleMotion owns the
 * actors and plays the choreography:
 *   - intro: letters drop in one by one, tumble, land with a flash and a glint
 *   - hover: letters near the cursor lift and charge
 *   - click: a shockwave kicks letters outward from the click point
 *   - idle: random star glints on the letters
 * The ambient crystal "breathing" is pure CSS (see .etu-glyph__energy).
 * The rAF loop only runs while something is moving.
 */

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

const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(Math.max((x - a) / (b - a), 0), 1)
  return t * t * (3 - 2 * t)
}

/** Seconds from an actor's intro start until it lands. */
const LAND_TIME = 0.36

export class GlyphActor {
  readonly el: HTMLElement
  private chargeEl: HTMLElement | null
  /** Rest centre relative to the title, px. */
  center = { x: 0, y: 0 }

  x = new Spring(0, 120, 0.5)
  y = new Spring(0, 120, 0.5)
  rot = new Spring(0, 90, 0.45)
  zoom = new Spring(1, 140, 0.5)
  charge = new Spring(0, 70, 0.9)
  opacity = 1
  flash = 0

  private introAt = -1
  private landed = true
  private pulseAt = -1

  constructor(el: HTMLElement) {
    this.el = el
    this.chargeEl = el.querySelector('.etu-glyph__charge')
  }

  measure() {
    this.center = {
      x: this.el.offsetLeft + this.el.offsetWidth / 2,
      y: this.el.offsetTop + this.el.offsetHeight / 2,
    }
  }

  /** Hide and park the letter above its slot, tilted and enlarged. */
  stageDrop(size: number) {
    this.opacity = 0
    this.x.snap((Math.random() - 0.5) * 0.3 * size)
    this.y.snap(-0.75 * size)
    this.rot.snap((Math.random() - 0.5) * 0.5)
    this.zoom.snap(1.35)
    this.landed = false
  }

  dropAt(t: number) {
    this.introAt = t
  }

  pulse(at: number) {
    this.pulseAt = at
  }

  hover(proximity: number, size: number) {
    this.charge.target = proximity
    if (this.introAt >= 0 || !this.landed) return
    this.y.target = -0.07 * size * proximity
    this.zoom.target = 1 + 0.05 * proximity
  }

  get introducing() {
    return !this.landed || this.introAt >= 0
  }

  /** Returns true when the letter has just landed (for glints). */
  update(t: number, dt: number, size: number): boolean {
    let landedNow = false
    if (this.introAt >= 0 && t >= this.introAt) {
      const local = t - this.introAt
      this.x.target = 0
      this.y.target = 0
      this.rot.target = 0
      this.zoom.target = 1
      this.opacity = smoothstep(0, 0.2, local)
      if (!this.landed && local >= LAND_TIME) {
        this.landed = true
        this.flash = 1
        landedNow = true
      }
      if (local > 1.2) this.introAt = -1
    }
    if (this.pulseAt >= 0 && t >= this.pulseAt) {
      this.pulseAt = -1
      this.flash = Math.max(this.flash, 0.8)
      this.y.velocity -= size * 1.8
      this.rot.velocity += (Math.random() - 0.5) * 2
      this.charge.velocity += 6
    }
    this.flash *= Math.exp(-dt * 3.5)
    for (const s of [this.x, this.y, this.rot, this.zoom, this.charge]) s.step(dt)
    return landedNow
  }

  apply() {
    const s = this.el.style
    s.opacity = this.opacity >= 0.999 ? '' : this.opacity.toFixed(3)
    const still = this.x.atRest && this.y.atRest && this.rot.atRest && this.zoom.atRest &&
      this.x.value === 0 && this.y.value === 0 && this.rot.value === 0 && this.zoom.value === 1
    s.transform = still
      ? ''
      : `translate(${this.x.value.toFixed(2)}px, ${this.y.value.toFixed(2)}px) rotate(${this.rot.value.toFixed(4)}rad) scale(${this.zoom.value.toFixed(4)})`
    s.filter = this.flash > 0.01 ? `brightness(${(1 + this.flash * 1.1).toFixed(3)})` : ''
    if (this.chargeEl) {
      const c = Math.min(Math.max(this.charge.value, 0) * 0.9 + this.flash, 1)
      this.chargeEl.style.opacity = c > 0.005 ? c.toFixed(3) : ''
    }
  }

  get calm() {
    return (
      this.introAt < 0 && this.pulseAt < 0 && this.flash < 0.01 &&
      this.x.atRest && this.y.atRest && this.rot.atRest && this.zoom.atRest && this.charge.atRest
    )
  }

  settle() {
    this.introAt = -1
    this.landed = true
    this.opacity = 1
    this.flash = 0
    for (const s of [this.x, this.y, this.rot, this.charge]) s.snap(0)
    this.zoom.snap(1)
  }
}

export interface TitleMotionOptions {
  intro?: boolean
  /** Seconds between letters in the intro (compressed for long titles). */
  stagger?: number
  interactive?: boolean
  /** Idle glints. */
  glints?: boolean
}

export class TitleMotion {
  private host: HTMLElement
  private actors: GlyphActor[]
  private opts: Required<TitleMotionOptions>
  private raf = 0
  private running = false
  private last = 0
  private clock0 = performance.now()
  private introPending: boolean
  private visible = false
  private pointer: { x: number; y: number } | null = null
  private glintTimer = 0
  private disposers: (() => void)[] = []

  constructor(host: HTMLElement, options: TitleMotionOptions = {}) {
    this.host = host
    this.opts = {
      intro: options.intro ?? true,
      stagger: options.stagger ?? 0.07,
      interactive: options.interactive ?? true,
      glints: options.glints ?? true,
    }
    this.actors = Array.from(host.querySelectorAll<HTMLElement>('.etu-glyph')).map((el) => new GlyphActor(el))
    this.introPending = this.opts.intro && this.actors.length > 0
    this.measure()
    if (this.introPending) {
      const size = this.size()
      for (const a of this.actors) {
        a.stageDrop(size)
        a.apply()
      }
    }

    const io = new IntersectionObserver(([e]) => this.setVisible(e.isIntersecting), { threshold: 0.2 })
    io.observe(host)
    const ro = new ResizeObserver(() => this.measure())
    ro.observe(host)
    const onVis = () => this.setVisible(this.visible)
    document.addEventListener('visibilitychange', onVis)
    this.disposers.push(() => io.disconnect(), () => ro.disconnect(), () => document.removeEventListener('visibilitychange', onVis))

    if (this.opts.interactive) {
      const local = (e: PointerEvent) => {
        const r = host.getBoundingClientRect()
        return { x: e.clientX - r.left, y: e.clientY - r.top }
      }
      const move = (e: PointerEvent) => {
        this.pointer = local(e)
        this.wake()
      }
      const leave = () => {
        this.pointer = null
        for (const a of this.actors) a.hover(0, this.size())
        this.wake()
      }
      const down = (e: PointerEvent) => this.pulse(local(e).x)
      host.addEventListener('pointermove', move)
      host.addEventListener('pointerleave', leave)
      host.addEventListener('pointerdown', down)
      this.disposers.push(() => {
        host.removeEventListener('pointermove', move)
        host.removeEventListener('pointerleave', leave)
        host.removeEventListener('pointerdown', down)
      })
    }
  }

  dispose() {
    cancelAnimationFrame(this.raf)
    this.running = false
    window.clearTimeout(this.glintTimer)
    for (const d of this.disposers) d()
    for (const a of this.actors) {
      a.settle()
      a.apply()
    }
  }

  /** Shockwave from an x position (px within the title). */
  pulse(x: number) {
    const t = this.now()
    const size = this.size()
    for (const a of this.actors) a.pulse(t + Math.abs(a.center.x - x) / (size * 14))
    this.wake()
  }

  replayIntro() {
    const size = this.size()
    for (const a of this.actors) a.stageDrop(size)
    this.introPending = true
    if (this.visible) this.playIntro()
  }

  /** The letters' font size (after any fit scaling), px. */
  private size() {
    const el = this.actors[0]?.el ?? this.host
    return parseFloat(getComputedStyle(el).fontSize) || 48
  }

  private now() {
    return (performance.now() - this.clock0) / 1000
  }

  private measure() {
    for (const a of this.actors) a.measure()
  }

  private setVisible(v: boolean) {
    this.visible = v
    const active = v && !document.hidden
    if (active && this.introPending) this.playIntro()
    window.clearTimeout(this.glintTimer)
    if (active && this.opts.glints) this.scheduleGlint()
  }

  private playIntro() {
    this.introPending = false
    const t = this.now() + 0.05
    const stagger = Math.min(this.opts.stagger, 1.2 / this.actors.length)
    this.actors.forEach((a, i) => a.dropAt(t + i * stagger))
    this.wake()
  }

  private scheduleGlint() {
    this.glintTimer = window.setTimeout(() => {
      const idle = this.actors.filter((a) => !a.introducing)
      if (idle.length) this.glint(idle[Math.floor(Math.random() * idle.length)])
      this.scheduleGlint()
    }, 1800 + Math.random() * 2800)
  }

  /** A star flare somewhere on the letter's outline. */
  private glint(a: GlyphActor) {
    const star = document.createElement('span')
    star.className = 'etu-glint'
    const edge = Math.random() < 0.5
    const u = Math.random()
    star.style.left = `${(edge ? Math.round(u) : u) * 100}%`
    star.style.top = `${(edge ? u : Math.round(u)) * 100}%`
    star.addEventListener('animationend', () => star.remove())
    a.el.appendChild(star)
  }

  private wake() {
    if (this.running) return
    this.running = true
    this.last = performance.now()
    const tick = (now: number) => {
      const dt = Math.min((now - this.last) / 1000, 1 / 30)
      this.last = now
      const t = this.now()
      const size = this.size()
      if (this.pointer) {
        for (const a of this.actors) {
          const d = Math.hypot(this.pointer.x - a.center.x, this.pointer.y - a.center.y) / (size * 0.9)
          a.hover(Math.exp(-d * d), size)
        }
      }
      let calm = !this.pointer
      for (const a of this.actors) {
        if (a.update(t, dt, size)) this.glint(a)
        a.apply()
        if (!a.calm) calm = false
      }
      if (calm) {
        this.running = false
        return
      }
      this.raf = requestAnimationFrame(tick)
    }
    this.raf = requestAnimationFrame(tick)
  }
}
