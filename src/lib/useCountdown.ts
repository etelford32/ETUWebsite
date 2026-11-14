"use client"

import { useEffect, useState } from 'react'

/** Days, hours, minutes, seconds. */
export type CountdownParts = [number, number, number, number]

function partsUntil(target: string): CountdownParts | null {
  const difference = Date.parse(target) - Date.now()
  if (difference <= 0) return null
  return [
    Math.floor(difference / 86_400_000),
    Math.floor((difference / 3_600_000) % 24),
    Math.floor((difference / 60_000) % 60),
    Math.floor((difference / 1000) % 60),
  ]
}

/**
 * Time left until an ISO timestamp, ticking once a second.
 *
 * `undefined` until mounted, so the prerendered HTML and the first client
 * render agree; `null` once the target has passed.
 */
export function useCountdown(target: string): CountdownParts | null | undefined {
  const [parts, setParts] = useState<CountdownParts | null | undefined>(undefined)

  useEffect(() => {
    const tick = () => setParts(partsUntil(target))
    tick()
    const timer = setInterval(tick, 1000)
    return () => clearInterval(timer)
  }, [target])

  return parts
}
