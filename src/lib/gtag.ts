/**
 * Thin, safe wrapper around GA4's gtag (tag G-6RCVW65DDL, loaded in the root
 * layout). Every call is a no-op during SSR, before the tag has loaded, or
 * when an ad blocker has removed it: nothing here ever throws.
 *
 * GA's terms forbid sending personally identifiable information, so params
 * are scrubbed: PII-looking keys are dropped, email-looking values are
 * dropped, and only short primitive values are kept.
 */

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void
    dataLayer?: unknown[]
  }
}

export type GtagParams = Record<string, unknown>

/** Keys that could identify a person. Matched case-insensitively. */
const PII_KEY = /(e-?mail|name|user_?id|uid|steam_?id|visitor_?id|session_?id|phone|address|\bip\b|ip_?addr|token|password|secret)/i
const EMAIL_VALUE = /[^\s@]+@[^\s@]+\.[^\s@]+/
// GA4 caps event parameter values at 100 characters.
const MAX_VALUE_LENGTH = 100

const DEBUG_STORAGE_KEY = 'ga_debug_mode'

export function scrubGtagParams(params: GtagParams = {}): Record<string, string | number | boolean> {
  const clean: Record<string, string | number | boolean> = {}
  for (const [key, value] of Object.entries(params)) {
    if (PII_KEY.test(key)) continue
    if (typeof value === 'string') {
      if (EMAIL_VALUE.test(value)) continue
      clean[key] = value.slice(0, MAX_VALUE_LENGTH)
    } else if (typeof value === 'number' && Number.isFinite(value)) {
      clean[key] = value
    } else if (typeof value === 'boolean') {
      clean[key] = value
    }
    // Objects, arrays, null/undefined: dropped.
  }
  return clean
}

/**
 * DebugView: on in development, or for this tab once any URL carries
 * ?debug_mode=1 (?debug_mode=0 turns it back off).
 */
export function isDebugMode(): boolean {
  if (process.env.NODE_ENV === 'development') return true
  try {
    const flag = new URLSearchParams(window.location.search).get('debug_mode')
    if (flag === '1' || flag === 'true') sessionStorage.setItem(DEBUG_STORAGE_KEY, '1')
    else if (flag === '0' || flag === 'false') sessionStorage.removeItem(DEBUG_STORAGE_KEY)
    return sessionStorage.getItem(DEBUG_STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

/** The GA4 measurement id, loaded in the root layout. */
export const GA_MEASUREMENT_ID = 'G-6RCVW65DDL'

/**
 * True once gtag.js itself has loaded and run (it defines
 * window.google_tag_manager). False while it is still loading, or when an ad
 * blocker or the CSP stopped it.
 */
export function isGtagLoaded(): boolean {
  return typeof window !== 'undefined' && !!(window as any).google_tag_manager?.[GA_MEASUREMENT_ID]
}

/**
 * window.gtag, created as Google's standard queueing stub if the layout's
 * inline snippet hasn't run yet. Calls made before gtag.js loads wait in
 * dataLayer and are sent once it does, instead of being dropped.
 */
function getGtag(): (...args: unknown[]) => void {
  if (typeof window.gtag !== 'function') {
    window.dataLayer = window.dataLayer || []
    window.gtag = function gtag() {
      // gtag.js only reads Arguments objects, not arrays.
      // eslint-disable-next-line prefer-rest-params
      window.dataLayer!.push(arguments)
    }
  }
  return window.gtag
}

/** Send one GA4 event (queued until gtag.js loads). Returns true if queued or sent. */
export function sendGtagEvent(eventName: string, params?: GtagParams): boolean {
  if (typeof window === 'undefined') return false
  try {
    const payload: GtagParams = scrubGtagParams(params)
    if (isDebugMode()) payload.debug_mode = true
    // Explicit target, so an event queued ahead of the layout's
    // gtag('config') still reaches the property.
    payload.send_to = GA_MEASUREMENT_ID
    getGtag()('event', eventName, payload)
    return true
  } catch {
    return false
  }
}

/**
 * Events from trackEvent() that are mirrored to GA4. Everything else stays
 * Supabase-only so GA4 keeps a clean list of conversions and funnel steps.
 */
export const GA4_MIRRORED_EVENTS: ReadonlySet<string> = new Set([
  // Key event: Steam wishlist / store click, with `placement`.
  'wishlist_steam',
  // Demo campaign: "Sign up for demo day" click, with `placement`.
  'demo_signup_click',
  // Steam account funnel.
  'steam_link_start',
  'steam_linked',
  'steam_unlinked',
  'steam_ownership_verified',
  'steam_ownership_not_owned',
])

/**
 * Cookie the account-creating API routes set so the browser can report the
 * GA4 `sign_up` event (the account is created server-side, where gtag does
 * not exist). Its value is the sign-up method, never anything personal.
 */
export const SIGNUP_COOKIE = 'etu_ga_signup'

export type SignUpMethod = 'email' | 'google' | 'steam' | 'invite'
