'use client'

import { useEffect, useRef } from 'react'
import { SHIP, type ShipSkin } from '@/lib/shipDesigner'

/**
 * The ship, as it looks in flight: the game's lit hull for the chosen skin
 * (exported from etu.render.ship_hull_3d) over an idle exhaust in the skin's
 * own thruster and trail colours. The hull is the game's pixels; only the
 * exhaust and the glow are drawn here, from the palette the game gives.
 */
export default function ShipHangar({ skin, className }: { skin: ShipSkin; className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const sprite = SHIP.litSprite
    const image = new Image()
    image.src = skin.lit
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    // The stage, in sprite pixels: the hull with room around it for the glow
    // and below it for the exhaust.
    const stageW = sprite.width * 1.3
    const stageH = sprite.height * 1.36
    const originX = (stageW - sprite.width) / 2
    const originY = sprite.height * 0.06

    let frame = 0
    let disposed = false

    const draw = (timeMs: number) => {
      if (disposed) return
      const box = canvas.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const pxW = Math.max(1, Math.round(box.width * dpr))
      const pxH = Math.max(1, Math.round(box.height * dpr))
      if (canvas.width !== pxW || canvas.height !== pxH) {
        canvas.width = pxW
        canvas.height = pxH
      }
      const scale = Math.min(pxW / stageW, pxH / stageH)
      const t = still ? 0 : timeMs / 1000

      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.clearRect(0, 0, pxW, pxH)
      ctx.setTransform(scale, 0, 0, scale, (pxW - stageW * scale) / 2, (pxH - stageH * scale) / 2)
      // A slow idle drift, so the ship sits in space and not on a page.
      ctx.translate(originX, originY + Math.sin(t * 0.9) * sprite.height * 0.008)

      // Glow behind the hull.
      const glow = ctx.createRadialGradient(
        sprite.width / 2, sprite.height * 0.55, 0,
        sprite.width / 2, sprite.height * 0.55, sprite.height * 0.62
      )
      glow.addColorStop(0, withAlpha(skin.palette.glow, 0.2))
      glow.addColorStop(1, withAlpha(skin.palette.glow, 0))
      ctx.fillStyle = glow
      ctx.fillRect(-originX, -originY, stageW, stageH)

      // Exhaust under each thruster housing.
      ctx.globalCompositeOperation = 'lighter'
      sprite.thrusters.forEach((thruster, index) => {
        const flicker = still
          ? 1
          : 0.86 + 0.09 * Math.sin(t * 17 + index * 2.1) + 0.05 * Math.sin(t * 41 + index)
        const width = sprite.thrusterWidth * 0.6
        const length = sprite.height * 0.26 * flicker
        drawFlame(ctx, thruster.x, thruster.y, width * 1.5, length, skin.palette.trail, 0.5)
        drawFlame(ctx, thruster.x, thruster.y, width, length * 0.72, skin.palette.thruster, 0.85)
        drawFlame(ctx, thruster.x, thruster.y, width * 0.42, length * 0.4, '#ffffff', 0.9)
      })
      ctx.globalCompositeOperation = 'source-over'

      if (image.complete && image.naturalWidth > 0) {
        ctx.imageSmoothingQuality = 'high'
        ctx.drawImage(image, 0, 0, sprite.width, sprite.height)
      }

      if (!still) frame = requestAnimationFrame(draw)
    }

    image.onload = () => {
      if (still) draw(0)
    }
    frame = requestAnimationFrame(draw)
    const onResize = () => {
      if (still) draw(0)
    }
    window.addEventListener('resize', onResize)
    return () => {
      disposed = true
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', onResize)
    }
  }, [skin])

  return (
    <canvas
      ref={canvasRef}
      className={className}
      role="img"
      aria-label={`${skin.name} hull, as it looks in flight`}
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
