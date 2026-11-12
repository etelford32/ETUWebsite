"use client"

import { useEffect, useState } from 'react'
import { isDemoLive } from '@/lib/campaign'

/**
 * Whether the demo has launched, re-checked while the page stays open so a
 * visitor watching the countdown sees the buttons flip at zero.
 *
 * Starts false on both server and client (pages are prerendered, so the
 * build-time answer can't be trusted) and settles after mount.
 */
export function useDemoLive(): boolean {
  const [live, setLive] = useState(false)

  useEffect(() => {
    const check = () => setLive(isDemoLive())
    check()
    const timer = setInterval(check, 15_000)
    return () => clearInterval(timer)
  }, [])

  return live
}
