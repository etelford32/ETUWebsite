"use client"

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { trackEvent, trackWishlistClick } from '@/lib/analytics'
import { DEMO_DATE_SHORT, DEMO_PATH, DEMO_RELEASE_AT, steamStoreUrl } from '@/lib/campaign'
import { useCountdown } from '@/lib/useCountdown'

/** Pages that already carry the full launch board, or are the sign-up form. */
const HIDDEN_ON = ['/', DEMO_PATH, '/login']

const pad = (n: number) => String(n).padStart(2, '0')

/**
 * The gold line above the header on every page: the free demo, its date and
 * a running countdown, linking to the demo-day checklist. Once the demo is
 * out it turns green and links to Steam instead. It sits above the sticky
 * header in normal flow, so it scrolls away with the page.
 */
export default function DemoRibbon() {
  const pathname = usePathname()
  const parts = useCountdown(DEMO_RELEASE_AT)

  if (HIDDEN_ON.includes(pathname ?? '') || pathname?.startsWith('/admin')) return null

  if (parts === null) {
    return (
      <a
        href={steamStoreUrl('ribbon')}
        target="_blank"
        rel="noopener noreferrer"
        className="demo-ribbon demo-ribbon--live"
        onClick={() => void trackWishlistClick('ribbon', { intent: 'demo' })}
      >
        <span className="demo-ribbon__chip">
          <i aria-hidden="true" />
          Live now
        </span>
        <span>
          The free demo is out<span className="hidden sm:inline"> on Steam</span>
        </span>
        <span className="demo-ribbon__go">
          Play now <span aria-hidden="true">→</span>
        </span>
      </a>
    )
  }

  return (
    <Link
      href={DEMO_PATH}
      className="demo-ribbon"
      onClick={() => void trackEvent('demo_ribbon_click', 'click', { placement: 'ribbon' })}
    >
      <span className="demo-ribbon__chip">
        <i aria-hidden="true" />
        Free demo
      </span>
      <span className="hidden md:inline">Lands on Steam Thanksgiving Day, {DEMO_DATE_SHORT}</span>
      <span className="md:hidden">{DEMO_DATE_SHORT.replace('November', 'Nov')}</span>
      {/* Seconds only where there is room for them */}
      <span className="demo-ribbon__clock" aria-hidden="true">
        {parts ? (
          <>
            {parts[0]}d {pad(parts[1])}h {pad(parts[2])}m
            <span className="hidden sm:inline"> {pad(parts[3])}s</span>
          </>
        ) : (
          '--d --h --m'
        )}
      </span>
      <span className="demo-ribbon__go">
        <span className="sr-only sm:not-sr-only">Get ready</span> <span aria-hidden="true">→</span>
      </span>
    </Link>
  )
}
