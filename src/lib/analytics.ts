/**
 * ⚠️ MIGRATION IN PROGRESS: Analytics must use server-side API
 *
 * This file has been updated to prevent client-side Supabase usage.
 * All analytics tracking now uses server-side API routes for security.
 *
 * IMPLEMENTATION PLAN:
 * ====================
 *
 * Create these API routes for analytics:
 * - POST /api/analytics/session - Initialize user session
 * - POST /api/analytics/pageview - Track page views
 * - POST /api/analytics/event - Track custom events
 * - POST /api/analytics/end-session - End user session
 *
 * Current Status: Stub implementations that safely do nothing
 * TODO: Implement the API routes above and update these functions
 */

// Generate a unique session ID
function getSessionId(): string {
  if (typeof window === 'undefined') return ''

  let sessionId = sessionStorage.getItem('analytics_session_id')
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(7)}`
    sessionStorage.setItem('analytics_session_id', sessionId)
  }
  return sessionId
}

// Get device type
function getDeviceType(): string {
  if (typeof window === 'undefined') return 'unknown'

  const userAgent = navigator.userAgent.toLowerCase()
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(userAgent)) {
    return 'tablet'
  }
  if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(userAgent)) {
    return 'mobile'
  }
  return 'desktop'
}

// Get browser info
function getBrowserInfo(): { browser: string; os: string } {
  if (typeof window === 'undefined') return { browser: 'unknown', os: 'unknown' }

  const userAgent = navigator.userAgent
  let browser = 'unknown'
  let os = 'unknown'

  // Detect browser
  if (userAgent.indexOf('Firefox') > -1) browser = 'Firefox'
  else if (userAgent.indexOf('Chrome') > -1) browser = 'Chrome'
  else if (userAgent.indexOf('Safari') > -1) browser = 'Safari'
  else if (userAgent.indexOf('Edge') > -1) browser = 'Edge'
  else if (userAgent.indexOf('MSIE') > -1 || userAgent.indexOf('Trident') > -1) browser = 'IE'

  // Detect OS
  if (userAgent.indexOf('Win') > -1) os = 'Windows'
  else if (userAgent.indexOf('Mac') > -1) os = 'macOS'
  else if (userAgent.indexOf('Linux') > -1) os = 'Linux'
  else if (userAgent.indexOf('Android') > -1) os = 'Android'
  else if (userAgent.indexOf('iOS') > -1) os = 'iOS'

  return { browser, os }
}

// Parse UTM parameters
function getUTMParams(): { source?: string; medium?: string; campaign?: string } {
  if (typeof window === 'undefined') return {}

  const params = new URLSearchParams(window.location.search)
  return {
    source: params.get('utm_source') || undefined,
    medium: params.get('utm_medium') || undefined,
    campaign: params.get('utm_campaign') || undefined,
  }
}

// Initialize session - NOW USES API ROUTE
export async function initializeSession() {
  if (typeof window === 'undefined') return

  const sessionId = getSessionId()
  const { browser, os } = getBrowserInfo()
  const deviceType = getDeviceType()
  const utm = getUTMParams()

  try {
    await fetch('/api/analytics/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: sessionId,
        entry_page: window.location.pathname,
        referrer: document.referrer || null,
        utm_source: utm.source,
        utm_medium: utm.medium,
        utm_campaign: utm.campaign,
        device_type: deviceType,
        browser,
        os,
        metadata: {
          viewport: {
            width: window.innerWidth,
            height: window.innerHeight,
          },
          screen: {
            width: window.screen.width,
            height: window.screen.height,
          },
        },
      }),
    })
  } catch (error) {
    // Silently fail - analytics should not break the app
    console.debug('Analytics session init skipped:', error)
  }
}

// Track page view - NOW USES API ROUTE
export async function trackPageView(pageUrl?: string, pageTitle?: string) {
  if (typeof window === 'undefined') return

  const sessionId = getSessionId()
  const { browser, os } = getBrowserInfo()
  const deviceType = getDeviceType()

  try {
    await fetch('/api/analytics/pageview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: sessionId,
        page_url: pageUrl || window.location.pathname,
        page_title: pageTitle || document.title,
        referrer: document.referrer || null,
        user_agent: navigator.userAgent,
        device_type: deviceType,
        browser,
        os,
      }),
    })
  } catch (error) {
    // Silently fail - analytics should not break the app
    console.debug('Analytics pageview skipped:', error)
  }
}

// Track custom event - NOW USES API ROUTE
export async function trackEvent(
  eventName: string,
  eventType: string = 'custom',
  metadata?: Record<string, any>
) {
  if (typeof window === 'undefined') return

  const sessionId = getSessionId()
  const { browser, os } = getBrowserInfo()
  const deviceType = getDeviceType()

  try {
    await fetch('/api/analytics/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: sessionId,
        event_type: eventType,
        event_name: eventName,
        page_url: window.location.pathname,
        page_title: document.title,
        device_type: deviceType,
        browser,
        os,
        metadata: metadata || {},
      }),
    })
  } catch (error) {
    // Silently fail - analytics should not break the app
    console.debug('Analytics event skipped:', error)
  }
}

// Track button click
export function trackClick(buttonName: string, metadata?: Record<string, any>) {
  return trackEvent(buttonName, 'click', metadata)
}

// Track form submission
export function trackFormSubmit(formName: string, metadata?: Record<string, any>) {
  return trackEvent(formName, 'form_submit', metadata)
}

// Track authentication event
export function trackAuth(action: 'login' | 'logout' | 'signup', method?: string) {
  return trackEvent(`User ${action}`, 'auth', { action, method })
}

// Track error
export function trackError(errorMessage: string, errorType?: string, metadata?: Record<string, any>) {
  return trackEvent('Error', 'error', {
    message: errorMessage,
    type: errorType,
    ...metadata,
  })
}

// End session - NOW USES API ROUTE
export async function endSession() {
  if (typeof window === 'undefined') return

  const sessionId = getSessionId()

  try {
    await fetch('/api/analytics/end-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId }),
    })
  } catch (error) {
    // Silently fail - analytics should not break the app
    console.debug('Analytics end session skipped:', error)
  }
}

// Set up automatic session tracking
export function setupAnalytics() {
  if (typeof window === 'undefined') return

  // Initialize session on load
  initializeSession()

  // Track page views on navigation
  trackPageView()

  // End session on page unload
  window.addEventListener('beforeunload', () => {
    endSession()
  })

  // Track visibility changes
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      endSession()
    }
  })
}

// Hook for React components
export function useAnalytics() {
  return {
    trackPageView,
    trackEvent,
    trackClick,
    trackFormSubmit,
    trackAuth,
    trackError,
  }
}
