import { FRAGMENT_SHADER, VERTEX_SHADER } from './shaders'
import { buildAtlas, cellKey, type GlyphAtlas } from './atlas'
import { GlyphActor, type GlyphPlacement } from './actors'
import { resolvePreset, type EtuTitlePreset, type EtuTitleVariant } from './presets'

export interface EtuTitleRendererOptions {
  variant?: EtuTitleVariant
  /** Overrides the preset's glow intensity. */
  energy?: number
  /** Letters drop in and lock their tiles the first time `start()` runs. */
  intro?: boolean
  /** Seconds between successive letters in the intro. */
  stagger?: number
  /** Keep the ambient loop (pulses, sparkles, idle glints) running. */
  animate?: boolean
}

/** Glyph positions in CSS px relative to the canvas. */
export interface TitleLayout {
  width: number
  height: number
  dpr: number
  glyphs: GlyphPlacement[]
}

const UNIFORMS = [
  'uRes', 'uCellSize', 'uOrigin', 'uOffset', 'uRot', 'uZoom',
  'uAtlas', 'uAtlasSize', 'uCellRect', 'uPass', 'uScale', 'uTime', 'uCap',
  'uInMax', 'uOutMax', 'uTile', 'uDepth', 'uAccent', 'uEnergy', 'uCrystal',
  'uSeed', 'uExtrudeDir', 'uReveal', 'uOpacity', 'uFlash', 'uCharge', 'uPointer', 'uGlint',
] as const
type UniformName = (typeof UNIFORMS)[number]

/** Fixed shader clock for static (reduced-motion) frames. */
const STATIC_TIME = 2.6
/** Frame interval once everything has settled (~30fps). */
const CALM_FRAME_MS = 1000 / 30 - 2
const MAX_DT = 1 / 30

let supported: boolean | null = null

function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const shader = gl.createShader(type)
  if (!shader) return null
  gl.shaderSource(shader, src)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.warn('[EtuTitle] shader compile failed:', gl.getShaderInfoLog(shader))
    gl.deleteShader(shader)
    return null
  }
  return shader
}

/**
 * Renders ETU 2175 title typography into a canvas with WebGL. Each letter
 * is a GlyphActor drawn from a shared distance-field atlas.
 *
 *   const r = EtuTitleRenderer.create(canvas, { intro: true })
 *   r.setLayout(layout)   // whenever the DOM text moves or resizes
 *   r.start()             // when on screen; r.stop() when not
 *   r.setPointer({x, y})  // hover; r.pulse({x, y}) on click
 *   r.dispose()
 */
export class EtuTitleRenderer {
  private gl: WebGLRenderingContext
  private program: WebGLProgram
  private buffer: WebGLBuffer
  private texture: WebGLTexture
  private u = {} as Record<UniformName, WebGLUniformLocation | null>
  private preset: EtuTitlePreset
  private opts: Required<Omit<EtuTitleRendererOptions, 'variant' | 'energy'>>
  private maxTexture: number

  private atlas: GlyphAtlas | null = null
  private atlasKey = ''
  private actors: GlyphActor[] = []
  private dpr = 1
  private res = { w: 1, h: 1 }

  private raf = 0
  private running = false
  private clockStart = performance.now()
  private lastTick = 0
  private introPlayed = false
  private nextGlint = 3
  private pointer: { x: number; y: number } | null = null

  static isSupported(): boolean {
    if (typeof window === 'undefined') return false
    if (supported === null) {
      try {
        const probe = document.createElement('canvas').getContext('webgl')
        supported = !!probe
        // Release the probe at once: browsers cap live contexts (~16 in Chrome).
        probe?.getExtension('WEBGL_lose_context')?.loseContext()
      } catch {
        supported = false
      }
    }
    return supported
  }

  static create(canvas: HTMLCanvasElement, options: EtuTitleRendererOptions = {}) {
    const gl = canvas.getContext('webgl', {
      alpha: true,
      premultipliedAlpha: true,
      antialias: true,
      depth: false,
      stencil: false,
      powerPreference: 'low-power',
    })
    if (!gl) return null

    const vs = compile(gl, gl.VERTEX_SHADER, VERTEX_SHADER)
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER)
    if (!vs || !fs) return null
    const program = gl.createProgram()
    const buffer = gl.createBuffer()
    const texture = gl.createTexture()
    if (!program || !buffer || !texture) return null
    gl.attachShader(program, vs)
    gl.attachShader(program, fs)
    gl.linkProgram(program)
    gl.deleteShader(vs)
    gl.deleteShader(fs)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.warn('[EtuTitle] program link failed:', gl.getProgramInfoLog(program))
      return null
    }
    return new EtuTitleRenderer(gl, program, buffer, texture, options)
  }

  private constructor(
    gl: WebGLRenderingContext,
    program: WebGLProgram,
    buffer: WebGLBuffer,
    texture: WebGLTexture,
    options: EtuTitleRendererOptions,
  ) {
    this.gl = gl
    this.program = program
    this.buffer = buffer
    this.texture = texture
    this.preset = resolvePreset(options.variant, options.energy)
    this.opts = {
      intro: options.intro ?? true,
      stagger: options.stagger ?? 0.075,
      animate: options.animate ?? true,
    }
    this.introPlayed = !this.opts.intro
    this.maxTexture = gl.getParameter(gl.MAX_TEXTURE_SIZE) as number

    gl.useProgram(program)
    for (const name of UNIFORMS) this.u[name] = gl.getUniformLocation(program, name)

    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), gl.STATIC_DRAW)
    const loc = gl.getAttribLocation(program, 'aCorner')
    gl.enableVertexAttribArray(loc)
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)

    gl.bindTexture(gl.TEXTURE_2D, texture)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.uniform1i(this.u.uAtlas, 0)
    gl.enable(gl.BLEND)
  }

  get isRunning() {
    return this.running
  }

  /** Rebuild the atlas and actors for new glyph positions (CSS px). */
  setLayout(layout: TitleLayout) {
    const dpr = layout.dpr
    const placements: GlyphPlacement[] = layout.glyphs.map((g) => ({
      glyph: g.glyph,
      x: g.x * dpr,
      y: g.y * dpr,
      cap: g.cap * dpr,
    }))
    const gl = this.gl
    // The atlas only depends on which glyphs appear at which sizes.
    const atlasKey = Array.from(new Set(placements.map((p) => cellKey(p.glyph, p.cap)))).sort().join('|')
    if (atlasKey !== this.atlasKey || !this.atlas) {
      const atlas = buildAtlas(placements, this.maxTexture)
      if (!atlas) return
      gl.bindTexture(gl.TEXTURE_2D, this.texture)
      gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, atlas.width, atlas.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, atlas.data)
      this.atlas = atlas
      this.atlasKey = atlasKey
    }
    const atlas = this.atlas

    const canvas = gl.canvas as HTMLCanvasElement
    this.res = { w: Math.max(1, Math.round(layout.width * dpr)), h: Math.max(1, Math.round(layout.height * dpr)) }
    canvas.width = this.res.w
    canvas.height = this.res.h
    gl.viewport(0, 0, this.res.w, this.res.h)
    this.dpr = dpr

    const cellOf = (p: GlyphPlacement) => atlas.cells.get(cellKey(p.glyph, p.cap))!
    const sameText =
      placements.length === this.actors.length && placements.every((p, i) => p.glyph === this.actors[i].glyph)
    if (sameText) {
      // Reflow: keep each letter's animation state, just move it.
      placements.forEach((p, i) => this.actors[i].relocate(p, cellOf(p)))
    } else {
      this.actors = placements.map((p, i) => new GlyphActor(p, cellOf(p), i))
      if (this.introPlayed) {
        for (const a of this.actors) a.settle()
      } else {
        for (const a of this.actors) {
          a.opacity = 0
          a.reveal = 0
        }
      }
    }
    this.aimWalls()
    if (!this.running) this.draw(performance.now())
  }

  /** Walls recede toward a vanishing point centred below the title. */
  private aimWalls() {
    if (!this.actors.length) return
    const xs = this.actors.map((a) => a.center.x)
    const ys = this.actors.map((a) => a.center.y)
    const capMax = Math.max(...this.actors.map((a) => a.cap))
    const vx = (Math.min(...xs) + Math.max(...xs)) / 2
    const vy = Math.max(...ys) + capMax * 3
    for (const a of this.actors) {
      const dx = vx - a.center.x
      const dy = vy - a.center.y
      const l = Math.hypot(dx, dy) || 1
      a.extrudeDir = [dx / l, dy / l]
    }
  }

  /** Cursor position in CSS px relative to the canvas; `null` on leave. */
  setPointer(pos: { x: number; y: number } | null) {
    this.pointer = pos ? { x: pos.x * this.dpr, y: pos.y * this.dpr } : null
    this.applyPointer()
    this.wake()
  }

  /** Shockwave from a point (CSS px): letters kick and flash in sequence. */
  pulse(pos: { x: number; y: number }) {
    const t = this.now()
    const x = pos.x * this.dpr
    for (const a of this.actors) a.pulse(t + Math.abs(a.center.x - x) / (a.cap * 9))
    this.wake()
  }

  start() {
    if (this.running) return
    if (!this.introPlayed) {
      this.introPlayed = true
      const t = this.now() + 0.05
      const stagger = Math.min(this.opts.stagger, 1.1 / Math.max(this.actors.length, 1))
      this.actors.forEach((a, i) => a.dropIn(t + i * stagger))
    }
    if (!this.opts.animate && this.actors.every((a) => a.calm)) {
      this.draw(performance.now())
      return
    }
    this.running = true
    this.lastTick = performance.now()
    let lastDraw = 0
    const tick = (now: number) => {
      if (!this.running) return
      const dt = Math.min((now - this.lastTick) / 1000, MAX_DT)
      this.lastTick = now
      const calm = this.step(dt)
      if (!calm || now - lastDraw >= CALM_FRAME_MS) {
        lastDraw = now
        this.draw(now)
      }
      if (!this.opts.animate && calm) {
        this.running = false
        return
      }
      this.raf = requestAnimationFrame(tick)
    }
    this.raf = requestAnimationFrame(tick)
  }

  stop() {
    this.running = false
    cancelAnimationFrame(this.raf)
  }

  replayIntro() {
    this.introPlayed = false
    this.stop()
    this.start()
  }

  dispose() {
    this.stop()
    const gl = this.gl
    gl.deleteTexture(this.texture)
    gl.deleteBuffer(this.buffer)
    gl.deleteProgram(this.program)
    // Deliberately no WEBGL_lose_context: React StrictMode re-mounts onto the
    // same <canvas>, and getContext() would then hand back the lost context.
  }

  /** Restart the loop if it stopped (static mode) so interactions play out. */
  private wake() {
    if (!this.running && this.atlas) this.start()
  }

  private now() {
    return (performance.now() - this.clockStart) / 1000
  }

  private applyPointer() {
    const p = this.pointer
    for (const a of this.actors) {
      if (!p) {
        a.hover(0, null)
        continue
      }
      const d = Math.hypot(p.x - a.center.x, p.y - a.center.y) / (a.cap * 0.85)
      const ox = a.origin.x + a.offsetX.value
      const oy = a.origin.y + a.offsetY.value
      a.hover(Math.exp(-d * d), { x: p.x - ox, y: p.y - oy })
    }
  }

  /** Advance every actor; returns true when nothing is moving. */
  private step(dt: number) {
    const t = this.now()
    if (this.opts.animate && t >= this.nextGlint && this.actors.length) {
      this.nextGlint = t + 2.2 + Math.random() * 3
      const a = this.actors[Math.floor(Math.random() * this.actors.length)]
      if (!a.introducing) {
        a.sparkle(0.8)
        a.flash = Math.max(a.flash, 0.18)
      }
    }
    if (this.pointer) this.applyPointer()
    let calm = true
    for (const a of this.actors) {
      a.update(t, dt)
      if (!a.calm) calm = false
    }
    return calm && !this.pointer
  }

  private draw(now: number) {
    const atlas = this.atlas
    if (!atlas) return
    const gl = this.gl
    const u = this.u
    const p = this.preset
    const time = this.opts.animate ? (now - this.clockStart) / 1000 : STATIC_TIME
    const capMax = Math.max(...this.actors.map((a) => a.cap), 1)

    gl.useProgram(this.program)
    gl.uniform2f(u.uRes, this.res.w, this.res.h)
    gl.uniform2f(u.uAtlasSize, atlas.width, atlas.height)
    gl.uniform1f(u.uScale, this.dpr)
    gl.uniform1f(u.uTime, time)
    gl.uniform1f(u.uInMax, atlas.inMax)
    gl.uniform1f(u.uOutMax, atlas.outMax)
    gl.uniform1f(u.uTile, Math.max(capMax * p.tileScale, 4.5 * this.dpr))
    gl.uniform1f(u.uDepth, capMax * p.depthScale)
    gl.uniform3f(u.uAccent, ...p.accent)
    gl.uniform1f(u.uEnergy, p.energy)
    gl.uniform1f(u.uCrystal, p.crystal)

    gl.clearColor(0, 0, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT)

    for (let pass = 0; pass < 3; pass++) {
      if (pass === 0) gl.blendFunc(gl.ONE, gl.ONE)
      else gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
      gl.uniform1i(u.uPass, pass)
      for (const a of this.actors) {
        if (a.opacity <= 0.001) continue
        const c = a.cell
        gl.uniform2f(u.uCellSize, c.w, c.h)
        gl.uniform4f(u.uCellRect, c.x, c.y, c.w, c.h)
        gl.uniform2f(u.uOrigin, a.origin.x, a.origin.y)
        gl.uniform2f(u.uOffset, a.offsetX.value, a.offsetY.value)
        gl.uniform1f(u.uRot, a.rot.value)
        gl.uniform1f(u.uZoom, a.zoom.value)
        gl.uniform1f(u.uCap, a.cap)
        gl.uniform2f(u.uSeed, a.origin.x, a.origin.y)
        gl.uniform2f(u.uExtrudeDir, a.extrudeDir[0], a.extrudeDir[1])
        gl.uniform1f(u.uReveal, a.reveal)
        gl.uniform1f(u.uOpacity, a.opacity)
        gl.uniform1f(u.uFlash, a.flash)
        gl.uniform1f(u.uCharge, Math.max(a.charge.value, 0))
        gl.uniform3f(u.uPointer, a.pointer.x, a.pointer.y, a.pointer.s * Math.max(a.charge.value, 0))
        gl.uniform3f(u.uGlint, a.glint.x, a.glint.y, a.glint.s)
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
      }
    }
  }
}
