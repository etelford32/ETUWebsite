"use client"

import { useCallback, useEffect, useState } from 'react'
import { GA_MEASUREMENT_ID, isDebugMode, isGtagLoaded, sendGtagEvent } from '@/lib/gtag'

type Status = 'checking' | 'ok' | 'fail'

interface Check {
  label: string
  status: Status
  detail: string
}

// Where GA4 sends hits for most visitors. A request with no measurement id
// is ignored by Google, so probing it records nothing.
const COLLECT_PROBE = 'https://region1.google-analytics.com/g/collect'
const GOOGLE_HOST = /google-analytics\.com|analytics\.google\.com|googletagmanager\.com|doubleclick\.net|google\.com/

const ICON: Record<Status, string> = { checking: '…', ok: '✓', fail: '✕' }
const TONE: Record<Status, string> = {
  checking: 'text-slate-400',
  ok: 'text-emerald-300',
  fail: 'text-red-300',
}

/**
 * Checks, in this admin's own browser, the client half of GA4 collection:
 * the tag loaded, hits can leave the page, and the CSP isn't blocking them.
 * The dashboard below only covers the server's read access.
 */
export default function TagHealth() {
  const [checks, setChecks] = useState<Check[]>([])
  const [testSent, setTestSent] = useState<string | null>(null)
  const debug = typeof window !== 'undefined' && isDebugMode()

  const run = useCallback(async () => {
    const violations: string[] = []
    const onViolation = (e: SecurityPolicyViolationEvent) => {
      if (GOOGLE_HOST.test(e.blockedURI)) violations.push(`${e.effectiveDirective}: ${e.blockedURI}`)
    }
    document.addEventListener('securitypolicyviolation', onViolation)
    setChecks([
      { label: 'gtag.js loaded', status: 'checking', detail: '' },
      { label: 'Collection endpoint reachable', status: 'checking', detail: '' },
      { label: 'Content-Security-Policy', status: 'checking', detail: '' },
    ])

    // gtag.js loads after hydration; give it a few seconds.
    let loaded = isGtagLoaded()
    for (let i = 0; i < 20 && !loaded; i++) {
      await new Promise((r) => setTimeout(r, 250))
      loaded = isGtagLoaded()
    }

    let reachable = false
    let reachError = ''
    try {
      await fetch(COLLECT_PROBE, { method: 'POST', mode: 'no-cors', body: '', cache: 'no-store' })
      reachable = true
    } catch (e: any) {
      reachError = e?.message || 'request failed'
    }
    // Violation events are dispatched asynchronously.
    await new Promise((r) => setTimeout(r, 300))
    document.removeEventListener('securitypolicyviolation', onViolation)

    const cspBlocked = violations.length > 0
    setChecks([
      {
        label: 'gtag.js loaded',
        status: loaded ? 'ok' : 'fail',
        detail: loaded
          ? `Tag ${GA_MEASUREMENT_ID} is running in this browser.`
          : 'The tag script did not run. Usually an ad or tracking blocker (uBlock, Brave shields, Firefox strict mode, a VPN filter); try a clean private window.',
      },
      {
        label: 'Collection endpoint reachable',
        status: reachable ? 'ok' : 'fail',
        detail: reachable
          ? 'This browser can send hits to Google.'
          : cspBlocked
            ? 'Blocked by the site’s Content-Security-Policy (see below).'
            : `Blocked before leaving the browser (${reachError}). Most likely an ad blocker or privacy filter.`,
      },
      {
        label: 'Content-Security-Policy',
        status: cspBlocked ? 'fail' : 'ok',
        detail: cspBlocked
          ? `The CSP in next.config.js blocked: ${violations.join('; ')}`
          : 'No Google Analytics requests were blocked by the CSP.',
      },
    ])
  }, [])

  useEffect(() => {
    run()
  }, [run])

  function sendTest() {
    const at = new Date().toLocaleTimeString()
    sendGtagEvent('ga_tag_test', { source: 'admin_tag_health', debug_mode: true })
    setTestSent(at)
  }

  return (
    <section className="mb-8 p-5 rounded-xl border border-slate-800 bg-slate-900/60">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div>
          <h2 className="text-lg font-semibold">Tag health</h2>
          <p className="text-xs text-slate-500">
            Collection check from this browser. Visitors with blockers are never counted by GA; the Site analytics page still sees them.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={run} className="px-3 py-1.5 text-xs border border-slate-700 rounded-lg hover:bg-slate-800">
            Re-check
          </button>
          <button onClick={sendTest} className="px-3 py-1.5 text-xs border border-slate-700 rounded-lg hover:bg-slate-800">
            Send test event
          </button>
          <a
            href={debug ? '?debug_mode=0' : '?debug_mode=1'}
            className="px-3 py-1.5 text-xs border border-slate-700 rounded-lg hover:bg-slate-800"
          >
            {debug ? 'Turn off DebugView' : 'Turn on DebugView for this tab'}
          </a>
        </div>
      </div>
      <ul className="space-y-2">
        {checks.map((c) => (
          <li key={c.label} className="flex gap-3 text-sm">
            <span className={`w-4 font-bold ${TONE[c.status]}`} aria-label={c.status}>{ICON[c.status]}</span>
            <div>
              <div className="text-slate-200">{c.label}</div>
              {c.detail && <div className="text-xs text-slate-400 break-all">{c.detail}</div>}
            </div>
          </li>
        ))}
      </ul>
      {testSent && (
        <p className="mt-3 text-xs text-slate-400">
          Sent <code className="text-emerald-300">ga_tag_test</code> at {testSent}. It should appear within a few seconds in
          GA4 → Admin → DebugView, and in Reports → Realtime within a minute. Standard reports lag up to a day.
        </p>
      )}
    </section>
  )
}
