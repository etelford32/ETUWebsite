/**
 * The Thanksgiving demo campaign, in one place.
 *
 * Every demo CTA, countdown and email reads from here, and each one flips
 * from "sign up for demo day" to "play the free demo" on its own once
 * DEMO_RELEASE_AT has passed. To move the launch, change DEMO_RELEASE_AT and
 * redeploy — nothing else needs editing.
 */

/**
 * When the free demo goes live on Steam.
 *
 * The date is Thanksgiving Day 2026. The time of day is a placeholder
 * (10:00 AM Pacific, Steam's usual release slot) until the real one is set.
 */
export const DEMO_RELEASE_AT = '2026-11-26T18:00:00Z'

/** How the date is written in copy. */
export const DEMO_DATE_LABEL = 'Thanksgiving Day, November 26'
export const DEMO_DATE_SHORT = 'November 26'

/** The campaign landing page: the one link outside marketing points to. */
export const DEMO_PATH = '/demo'

/** Sign-up form that returns to the demo-day checklist afterwards. */
export const DEMO_SIGNUP_URL = `/login?mode=signup&redirect=${encodeURIComponent(DEMO_PATH)}`

/** Steam sign-in that returns to the demo-day checklist afterwards. */
export const DEMO_STEAM_SIGNIN_URL = `/api/steam/auth?redirect=${encodeURIComponent(DEMO_PATH)}`

export const DEMO_CAMPAIGN_ID = 'thanksgiving_demo'

const STEAM_STORE_BASE = 'https://store.steampowered.com/app/4094340/Explore_the_Universe_2175/'

export function isDemoLive(now: number = Date.now()): boolean {
  return now >= Date.parse(DEMO_RELEASE_AT)
}

/**
 * Steam store link tagged for Steamworks' UTM analytics, so store visits and
 * wishlists can be traced back to the website button that sent them.
 */
export function steamStoreUrl(placement: string): string {
  const params = new URLSearchParams({
    utm_source: 'etu_website',
    utm_medium: 'web',
    utm_campaign: DEMO_CAMPAIGN_ID,
    utm_content: placement,
  })
  return `${STEAM_STORE_BASE}?${params.toString()}`
}
