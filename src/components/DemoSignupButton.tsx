"use client"

import type { ReactNode } from 'react'
import Link from 'next/link'
import { trackEvent } from '@/lib/analytics'
import { DEMO_SIGNUP_URL } from '@/lib/campaign'
import { useDemoLive } from '@/lib/useDemoLive'
import WishlistButton from '@/components/WishlistButton'

interface DemoSignupButtonProps {
  /** Which button this is (header, hero, …) for the analytics funnel. */
  placement: string
  className?: string
  /** Label before launch. Defaults to "Sign up for demo day". */
  children?: ReactNode
  /** Label once the demo is live. Defaults to "Play the free demo". */
  liveLabel?: ReactNode
  /** Stay a sign-up link after launch (for "create your account" steps). */
  signupOnly?: boolean
}

/**
 * The campaign's primary call to action. Before launch it opens the sign-up
 * form, which returns to the demo-day checklist; once the demo is live it
 * sends players to Steam instead. Clicks are recorded as `demo_signup_click`
 * so the funnel (click → sign_up → wishlist_steam) can be read per placement.
 */
export default function DemoSignupButton({
  placement,
  className = 'btn-3d btn-3d-demo',
  children,
  liveLabel,
  signupOnly = false,
}: DemoSignupButtonProps) {
  const live = useDemoLive()

  if (live && !signupOnly) {
    return (
      <WishlistButton placement={placement} intent="demo" className={className}>
        {liveLabel ?? 'Play the free demo'}
      </WishlistButton>
    )
  }

  return (
    <Link
      href={DEMO_SIGNUP_URL}
      className={className}
      onClick={() => {
        void trackEvent('demo_signup_click', 'click', { placement })
      }}
    >
      {children ?? 'Sign up for demo day'}
    </Link>
  )
}
