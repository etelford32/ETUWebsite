"use client"

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import {
  initializeSession,
  trackPageView,
  endSession,
} from '@/lib/analytics'

/**
 * Mounts the client-side analytics pipeline:
 *  - initializes a session + records the first page view on load
 *  - records a page view on every client-side route change
 *  - ends the session on tab hide / unload
 *
 * Rendered once from the root layout. All tracking is best-effort and silent.
 */
export default function AnalyticsTracker() {
  const pathname = usePathname()
  const initialized = useRef(false)

  // One-time session init + lifecycle listeners.
  useEffect(() => {
    if (initialized.current) return
    initialized.current = true

    initializeSession()

    const handleHidden = () => {
      if (document.visibilityState === 'hidden') endSession()
    }
    window.addEventListener('beforeunload', endSession)
    document.addEventListener('visibilitychange', handleHidden)

    return () => {
      window.removeEventListener('beforeunload', endSession)
      document.removeEventListener('visibilitychange', handleHidden)
    }
  }, [])

  // Track every navigation (including the first paint).
  useEffect(() => {
    if (!pathname) return
    trackPageView(pathname)
  }, [pathname])

  return null
}
