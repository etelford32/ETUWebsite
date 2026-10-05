/**
 * Motion for ETU titles.
 *
 * The intro is "lights on": titles render as unlit shadows straight from the
 * server, and once the lit art has loaded and the title is on screen the
 * host gets `data-lit`, which starts the CSS power-on sequence (see
 * .etu-title in globals.css). A tiny inline script (POWER_ON_SCRIPT) does
 * this before React hydrates; TitleMotion does the same after, in case the
 * script didn't run.
 *
 * After that, every letter is a GlyphActor wrapping its DOM element: springs
 * for position, tilt and scale, plus `charge` (lights the crystal layer) and
 * `flash` (a brightness spike). TitleMotion plays the interactions:
 *   - hover: letters near the cursor lift and charge
 *   - click: a shockwave kicks letters outward from the click point
 *   - idle: random star glints on the letters
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

/**
 * Runs inline right after a title's markup, before hydration: wait for the
 * lit art and for the title to be on screen, then set `data-lit`.
 * Plain ES5 so it runs anywhere; `src` is the art URL to wait for.
 */
export const powerOnScript = (src: string) =>
  `(function(h,s){if(!h||h.hasAttribute('data-lit'))return;` +
  `function lit(){h.setAttribute('data-lit','')}` +
  `if(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches)return lit();` +
  `var i=new Image();i.src=s;` +
  `var a=i.decode?i.decode().catch(function(){}):new Promise(function(r){i.onload=i.onerror=r});` +
  `var v=new Promise(function(r){if(!('IntersectionObserver'in window))return r();` +
  `var o=new IntersectionObserver(function(e){if(e[0].isIntersecting){o.disconnect();r()}},{threshold:0.15});o.observe(h)});` +
  `Promise.all([a,v]).then(lit)})(document.currentScript&&document.currentScript.parentElement,${JSON.stringify(src)})`

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
  flash = 0

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

  pulse(at: number) {
    this.pulseAt = at
  }

  hover(proximity: number, size: number) {
    this.charge.target = proximity
    this.y.target = -0.07 * size * proximity
    this.zoom.target = 1 + 0.05 * proximity
  }

  update(t: number, dt: number, size: number) {
    if (this.pulseAt >= 0 && t >= this.pulseAt) {
      this.pulseAt = -1
      this.flash = Math.max(this.flash, 0.8)
      this.y.velocity -= size * 1.8
      this.rot.velocity += (Math.random() - 0.5) * 2
      this.charge.velocity += 6
    }
    this.flash *= Math.exp(-dt * 3.5)
    for (const s of [this.x, this.y, this.rot, this.zoom, this.charge]) s.step(dt)
  }

  apply() {
    const s = this.el.style
    const still = this.x.atRest && this.y.atRest && this.rot.atRest && this.zoom.atRest &&
      Math.abs(this.y.value) < 0.01 && Math.abs(this.rot.value) < 1e-4 && Math.abs(this.zoom.value - 1) < 1e-4
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
      this.pulseAt < 0 && this.flash < 0.01 &&
      this.x.atRest && this.y.atRest && this.rot.atRest && this.zoom.atRest && this.charge.atRest
    )
  }

  reset() {
    this.flash = 0
    this.pulseAt = -1
    for (const s of [this.x, this.y, this.rot, this.charge]) s.snap(0)
    this.zoom.snap(1)
  }
}

export interface TitleMotionOptions {
  /** Power the lights on (set data-lit) once `art` has loaded and the title is seen. */
  intro?: boolean
  /** Atlas URL the intro waits for. */
  art?: string
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
  private visible = false
  private pointer: { x: number; y: number } | null = null
  private glintTimer = 0
  private disposers: (() => void)[] = []

  constructor(host: HTMLElement, options: TitleMotionOptions = {}) {
    this.host = host
    this.opts = {
      intro: options.intro ?? true,
      art: options.art ?? '',
      interactive: options.interactive ?? true,
      glints: options.glints ?? true,
    }
    this.actors = Array.from(host.querySelectorAll<HTMLElement>('.etu-glyph')).map((el) => new GlyphActor(el))
    this.measure()

    if (!this.opts.intro) host.setAttribute('data-lit', '')
    const artReady = this.opts.art ? loadImage(this.opts.art) : Promise.resolve()

    const io = new IntersectionObserver(([e]) => {
      this.setVisible(e.isIntersecting)
      if (e.isIntersecting && !host.hasAttribute('data-lit')) {
        artReady.then(() => host.setAttribute('data-lit', ''))
      }
    }, { threshold: 0.15 })
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
      a.reset()
      a.apply()
    }
  }

  /** Shockwave from an x position (px within the title). */
  pulse(x: number) {
    if (!this.host.hasAttribute('data-lit')) return
    const t = this.now()
    const size = this.size()
    for (const a of this.actors) a.pulse(t + Math.abs(a.center.x - x) / (size * 14))
    this.wake()
  }

  /** Switch the lights off and on again. */
  replayIntro() {
    const h = this.host
    h.removeAttribute('data-lit')
    void h.offsetWidth // restart the CSS animations
    h.setAttribute('data-lit', '')
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
    window.clearTimeout(this.glintTimer)
    if (v && !document.hidden && this.opts.glints) this.scheduleGlint()
  }

  private scheduleGlint() {
    this.glintTimer = window.setTimeout(() => {
      if (this.host.hasAttribute('data-lit') && this.actors.length) {
        this.glint(this.actors[Math.floor(Math.random() * this.actors.length)])
      }
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
        a.update(t, dt, size)
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

function loadImage(src: string) {
  const img = new Image()
  img.src = src
  return (img.decode ? img.decode() : new Promise((r) => (img.onload = img.onerror = r))).catch(() => undefined)
}
