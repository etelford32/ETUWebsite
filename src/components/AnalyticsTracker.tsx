"use client"

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import {
  initializeSession,
  trackPageView,
  endSession,
} from '@/lib/analytics'
import { SIGNUP_COOKIE, isGtagAvailable, sendGtagEvent } from '@/lib/gtag'

const SIGNUP_METHODS = new Set(['email', 'google', 'steam', 'invite'])

function readSignUpCookie(): string | null {
  const row = document.cookie.split('; ').find(r => r.startsWith(`${SIGNUP_COOKIE}=`))
  return row ? decodeURIComponent(row.slice(SIGNUP_COOKIE.length + 1)) : null
}

function clearSignUpCookie() {
  document.cookie = `${SIGNUP_COOKIE}=; Max-Age=0; Path=/; SameSite=Lax`
}

/**
 * Report GA4's recommended `sign_up` event for an account the server just
 * created (flagged by markSignUpForAnalytics). gtag loads after hydration,
 * so wait briefly for it; the cookie is cleared only once the event is sent,
 * so it can't be counted twice. Returns a cleanup for the wait.
 */
function reportPendingSignUp(): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined
  let tries = 0
  const attempt = () => {
    const method = readSignUpCookie()
    if (!method) return
    if (!SIGNUP_METHODS.has(method)) {
      clearSignUpCookie()
      return
    }
    if (isGtagAvailable()) {
      clearSignUpCookie()
      sendGtagEvent('sign_up', { method })
      return
    }
    // gtag never showed up (blocked or slow): leave the cookie for the next
    // page, it expires on its own after 10 minutes.
    if (++tries < 20) timer = setTimeout(attempt, 500)
  }
  try {
    attempt()
  } catch {
    // Cookies unavailable: analytics is best effort.
  }
  return () => clearTimeout(timer)
}

/**
 * Mounts the client-side analytics pipeline:
 *  - initializes a session + records the first page view on load
 *  - records a page view on every client-side route change
 *  - ends the session on tab hide / unload
 *  - reports GA4 `sign_up` after the server creates an account
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
    return reportPendingSignUp()
  }, [pathname])

  return null
}
