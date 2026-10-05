import { FRAGMENT_SHADER, VERTEX_SHADER } from './shaders'
import { buildGlyphMask, type GlyphLayout, type GlyphMask } from './glyphMask'
import { resolvePreset, type EtuTitlePreset, type EtuTitleVariant } from './presets'

export interface EtuTitleRendererOptions {
  variant?: EtuTitleVariant
  /** Overrides the preset's glow intensity. */
  energy?: number
  /** Play the tile-assembly intro the first time `start()` runs. */
  intro?: boolean
  /** Intro length in seconds. */
  introDuration?: number
  /** Keep the ambient loop (pulses, sparkles, breathing glow) running. */
  animate?: boolean
}

const UNIFORMS = [
  'uMask', 'uRes', 'uScale', 'uTime', 'uReveal', 'uCell', 'uDepth',
  'uExtrudeDir', 'uTextBox', 'uAccent', 'uEnergy', 'uCrystal', 'uPointer',
] as const
type UniformName = (typeof UNIFORMS)[number]

/** Intro progress at which every tile has locked in and flashed out. */
const REVEAL_DONE = 1.4
/** Fixed shader clock for static (reduced-motion) frames. */
const STATIC_TIME = 2.6
const AMBIENT_FRAME_MS = 1000 / 30 - 2

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
 * Renders ETU 2175 title typography into a canvas with WebGL.
 *
 *   const r = EtuTitleRenderer.create(canvas, { intro: true })
 *   r.setLayout(layout)  // whenever the DOM text moves or resizes
 *   r.start()            // when on screen; r.stop() when not
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

  private mask: GlyphMask | null = null
  private dpr = 1
  private raf = 0
  private running = false
  private clockStart = 0
  private introStart = -1
  private introPlayed = false
  private pointer = { x: 0, y: 0, strength: 0, target: 0 }

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
      antialias: false,
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
      introDuration: options.introDuration ?? 2.2,
      animate: options.animate ?? true,
    }
    this.introPlayed = !this.opts.intro

    gl.useProgram(program)
    for (const name of UNIFORMS) this.u[name] = gl.getUniformLocation(program, name)

    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
    const loc = gl.getAttribLocation(program, 'aPos')
    gl.enableVertexAttribArray(loc)
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)

    gl.bindTexture(gl.TEXTURE_2D, texture)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.uniform1i(this.u.uMask, 0)

    this.clockStart = performance.now()
  }

  get isRunning() {
    return this.running
  }

  /** Rasterise the glyphs and resize the drawing buffer. */
  setLayout(layout: GlyphLayout) {
    const mask = buildGlyphMask(layout)
    if (!mask) return
    const gl = this.gl
    const canvas = gl.canvas as HTMLCanvasElement
    canvas.width = mask.width
    canvas.height = mask.height
    gl.viewport(0, 0, mask.width, mask.height)
    gl.bindTexture(gl.TEXTURE_2D, this.texture)
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, mask.width, mask.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, mask.data)
    this.mask = mask
    this.dpr = layout.dpr
    if (!this.running) this.draw(performance.now())
  }

  /** Cursor position in CSS px relative to the canvas; `null` releases the charge. */
  setPointer(pos: { x: number; y: number } | null) {
    if (pos) {
      this.pointer.x = pos.x * this.dpr
      this.pointer.y = pos.y * this.dpr
      this.pointer.target = 1
    } else {
      this.pointer.target = 0
    }
  }

  start() {
    if (this.running) return
    if (!this.introPlayed && this.introStart < 0) this.introStart = performance.now()
    if (!this.opts.animate && this.introPlayed) {
      this.draw(performance.now())
      return
    }
    this.running = true
    let last = 0
    const tick = (now: number) => {
      if (!this.running) return
      // The ambient loop is slow-moving; ~30fps halves GPU cost once settled.
      if (!this.introPlayed || now - last >= AMBIENT_FRAME_MS) {
        last = now
        this.draw(now)
      }
      if (!this.opts.animate && this.introPlayed) {
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
    this.introStart = performance.now()
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

  private revealProgress(now: number) {
    if (this.introPlayed) return REVEAL_DONE
    if (this.introStart < 0) return 0
    const t = (now - this.introStart) / 1000 / this.opts.introDuration
    // ease-out so the sweep lands softly
    const eased = 1 - Math.pow(1 - Math.min(t, 1), 2)
    if (t >= 1) this.introPlayed = true
    return eased * REVEAL_DONE
  }

  private draw(now: number) {
    const mask = this.mask
    if (!mask) return
    const gl = this.gl
    const u = this.u
    const p = this.preset

    const p0 = this.pointer
    p0.strength += (p0.target - p0.strength) * 0.08

    const time = this.opts.animate ? (now - this.clockStart) / 1000 : STATIC_TIME
    const dpr = this.dpr

    gl.useProgram(this.program)
    gl.uniform2f(u.uRes, mask.width, mask.height)
    gl.uniform1f(u.uScale, dpr)
    gl.uniform1f(u.uTime, time)
    gl.uniform1f(u.uReveal, this.revealProgress(now))
    gl.uniform1f(u.uCell, Math.max(mask.fontPx * p.cellScale, 5 * dpr))
    gl.uniform1f(u.uDepth, mask.fontPx * p.depthScale)
    gl.uniform2f(u.uExtrudeDir, p.extrudeDir[0], p.extrudeDir[1])
    gl.uniform4f(u.uTextBox, ...mask.textBox)
    gl.uniform3f(u.uAccent, ...p.accent)
    gl.uniform1f(u.uEnergy, p.energy)
    gl.uniform1f(u.uCrystal, p.crystal)
    gl.uniform3f(u.uPointer, p0.x, p0.y, p0.strength)

    gl.clearColor(0, 0, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
  }
}
