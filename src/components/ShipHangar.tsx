'use client'

import { useEffect, useRef } from 'react'
import { SHIP, type ShipSkin } from '@/lib/shipDesigner'

/** Degrees a second the ship turns on its own. */
const IDLE_TURN = 14
/** Seconds the ship holds still after being turned by hand. */
const HOLD_AFTER_DRAG = 2.5

/**
 * The ship, as it looks in flight.
 *
 * The hull is the game's lit 3D hull for the chosen skin (exported from
 * etu.render.ship_hull_3d), one frame per heading. In the game the key light
 * is fixed on screen and the ship turns under it, so the highlights slide
 * across the hull as it turns. This does the same: it picks the frame lit for
 * the ship's heading, blends to the next one, and turns the picture by that
 * heading. Only the exhaust and the glow are drawn here, in the skin's own
 * thruster and trail colours.
 *
 * Drag, or use the arrow keys, to turn the ship.
 */
export default function ShipHangar({ skin, className }: { skin: ShipSkin; className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  // The heading outlives a change of skin, so the new hull appears where the
  // old one was pointing. Degrees, counter-clockwise, 0 is nose up: the
  // angle pygame.transform.rotozoom takes.
  const heading = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const sprite = SHIP.litSprite
    const image = new Image()
    image.src = skin.lit
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    // The stage is a square around the point the ship turns about, wide
    // enough for the hull and its exhaust at any heading.
    const flameLength = sprite.height * 0.26
    const reach = Math.max(
      Math.hypot(sprite.pivot.x, sprite.pivot.y),
      Math.hypot(sprite.width - sprite.pivot.x, sprite.thrusters[0].y + flameLength - sprite.pivot.y)
    )
    const stage = reach * 2.04

    let frame = 0
    let disposed = false
    let lastMs = 0
    let holdUntil = 0
    let dragging: { x: number; heading: number } | null = null

    const drawFrame = (index: number, alpha: number) => {
      const wrapped = ((index % sprite.frames) + sprite.frames) % sprite.frames
      ctx.globalAlpha = alpha
      ctx.drawImage(
        image,
        (wrapped % sprite.columns) * sprite.width,
        Math.floor(wrapped / sprite.columns) * sprite.height,
        sprite.width,
        sprite.height,
        0,
        0,
        sprite.width,
        sprite.height
      )
      ctx.globalAlpha = 1
    }

    const draw = (timeMs: number) => {
      if (disposed) return
      const seconds = timeMs / 1000
      const dt = lastMs ? Math.min(0.1, (timeMs - lastMs) / 1000) : 0
      lastMs = timeMs
      if (!still && !dragging && seconds > holdUntil) heading.current += IDLE_TURN * dt

      const box = canvas.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const pxW = Math.max(1, Math.round(box.width * dpr))
      const pxH = Math.max(1, Math.round(box.height * dpr))
      if (canvas.width !== pxW || canvas.height !== pxH) {
        canvas.width = pxW
        canvas.height = pxH
      }
      const scale = Math.min(pxW, pxH) / stage
      const t = still ? 0 : seconds

      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.clearRect(0, 0, pxW, pxH)
      ctx.setTransform(scale, 0, 0, scale, pxW / 2, pxH / 2)

      // Glow behind the hull; it does not turn.
      const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, reach)
      glow.addColorStop(0, withAlpha(skin.palette.glow, 0.22))
      glow.addColorStop(1, withAlpha(skin.palette.glow, 0))
      ctx.fillStyle = glow
      ctx.fillRect(-stage / 2, -stage / 2, stage, stage)

      // Into the ship's own frame: rotozoom turns counter-clockwise, the
      // canvas turns clockwise.
      ctx.rotate((-heading.current * Math.PI) / 180)
      ctx.translate(-sprite.pivot.x, -sprite.pivot.y)

      ctx.globalCompositeOperation = 'lighter'
      sprite.thrusters.forEach((thruster, index) => {
        const flicker = still
          ? 1
          : 0.86 + 0.09 * Math.sin(t * 17 + index * 2.1) + 0.05 * Math.sin(t * 41 + index)
        const width = sprite.thrusterWidth * 0.6
        const length = flameLength * flicker
        drawFlame(ctx, thruster.x, thruster.y, width * 1.5, length, skin.palette.trail, 0.5)
        drawFlame(ctx, thruster.x, thruster.y, width, length * 0.72, skin.palette.thruster, 0.85)
        drawFlame(ctx, thruster.x, thruster.y, width * 0.42, length * 0.4, '#ffffff', 0.9)
      })
      ctx.globalCompositeOperation = 'source-over'

      if (image.complete && image.naturalWidth > 0) {
        ctx.imageSmoothingQuality = 'high'
        // The frame lit for this heading, with the next one faded in over it.
        // Every frame has the same silhouette, so only the light changes.
        const position = (((heading.current % 360) + 360) % 360) / sprite.stepDegrees
        const base = Math.floor(position)
        drawFrame(base, 1)
        const blend = position - base
        if (blend > 0.01) drawFrame(base + 1, blend)
      }

      if (!still) frame = requestAnimationFrame(draw)
    }

    // With motion reduced nothing animates; the ship is redrawn when it is
    // turned by hand or the page changes.
    const redraw = () => {
      if (still) draw(performance.now())
    }
    image.onload = redraw

    const onPointerDown = (event: PointerEvent) => {
      dragging = { x: event.clientX, heading: heading.current }
      canvas.setPointerCapture(event.pointerId)
    }
    const onPointerMove = (event: PointerEvent) => {
      if (!dragging) return
      // Dragging right turns the nose right, which is clockwise.
      heading.current = dragging.heading - (event.clientX - dragging.x) * 0.6
      redraw()
    }
    const onPointerUp = () => {
      if (!dragging) return
      dragging = null
      holdUntil = performance.now() / 1000 + HOLD_AFTER_DRAG
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
      event.preventDefault()
      heading.current += event.key === 'ArrowLeft' ? sprite.stepDegrees : -sprite.stepDegrees
      holdUntil = performance.now() / 1000 + HOLD_AFTER_DRAG
      redraw()
    }

    canvas.addEventListener('pointerdown', onPointerDown)
    canvas.addEventListener('pointermove', onPointerMove)
    canvas.addEventListener('pointerup', onPointerUp)
    canvas.addEventListener('pointercancel', onPointerUp)
    canvas.addEventListener('keydown', onKeyDown)
    window.addEventListener('resize', redraw)
    frame = requestAnimationFrame(draw)

    return () => {
      disposed = true
      cancelAnimationFrame(frame)
      canvas.removeEventListener('pointerdown', onPointerDown)
      canvas.removeEventListener('pointermove', onPointerMove)
      canvas.removeEventListener('pointerup', onPointerUp)
      canvas.removeEventListener('pointercancel', onPointerUp)
      canvas.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('resize', redraw)
    }
  }, [skin])

  return (
    <canvas
      ref={canvasRef}
      className={`cursor-grab touch-pan-y select-none active:cursor-grabbing focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 ${
        className ?? ''
      }`}
      tabIndex={0}
      role="img"
      aria-label={`${skin.name} hull, as it looks in flight. Drag or use the left and right arrow keys to turn it.`}
    />
  )
}

function drawFlame(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  length: number,
  color: string,
  alpha: number
) {
  const gradient = ctx.createLinearGradient(x, y, x, y + length)
  gradient.addColorStop(0, withAlpha(color, alpha))
  gradient.addColorStop(0.35, withAlpha(color, alpha * 0.55))
  gradient.addColorStop(1, withAlpha(color, 0))
  ctx.fillStyle = gradient
  ctx.beginPath()
  ctx.moveTo(x - width / 2, y)
  ctx.quadraticCurveTo(x - width / 2, y + length * 0.45, x, y + length)
  ctx.quadraticCurveTo(x + width / 2, y + length * 0.45, x + width / 2, y)
  ctx.closePath()
  ctx.fill()
}

function withAlpha(hex: string, alpha: number): string {
  const value = parseInt(hex.slice(1), 16)
  return `rgba(${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}, ${alpha})`
}
