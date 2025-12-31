import { supabase } from './supabaseClient'

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

// Initialize session
export async function initializeSession() {
  if (typeof window === 'undefined') return

  const sessionId = getSessionId()
  const { browser, os } = getBrowserInfo()
  const deviceType = getDeviceType()
  const utm = getUTMParams()

  try {
    const { data: { user } } = await supabase.auth.getUser()

    const sessionData = {
      session_id: sessionId,
      user_id: user?.id || null,
      started_at: new Date().toISOString(),
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
    }

    await supabase.from('user_sessions').insert(sessionData)
  } catch (error) {
    console.error('Error initializing session:', error)
  }
}

// Track page view
export async function trackPageView(pageUrl?: string, pageTitle?: string) {
  if (typeof window === 'undefined') return

  const sessionId = getSessionId()
  const { browser, os } = getBrowserInfo()
  const deviceType = getDeviceType()

  try {
    const { data: { user } } = await supabase.auth.getUser()

    const eventData = {
      user_id: user?.id || null,
      session_id: sessionId,
      event_type: 'page_view',
      event_name: 'Page View',
      page_url: pageUrl || window.location.pathname,
      page_title: pageTitle || document.title,
      referrer: document.referrer || null,
      user_agent: navigator.userAgent,
      device_type: deviceType,
      browser,
      os,
    }

    await supabase.from('analytics_events').insert(eventData)

    // Update session page view count
    await supabase.rpc('increment_session_page_views', { p_session_id: sessionId })
  } catch (error) {
    console.error('Error tracking page view:', error)
  }
}

// Track custom event
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
    const { data: { user } } = await supabase.auth.getUser()

    const eventData = {
      user_id: user?.id || null,
      session_id: sessionId,
      event_type: eventType,
      event_name: eventName,
      page_url: window.location.pathname,
      page_title: document.title,
      device_type: deviceType,
      browser,
      os,
      metadata: metadata || {},
    }

    await supabase.from('analytics_events').insert(eventData)

    // Update session events count
    await supabase.rpc('increment_session_events', { p_session_id: sessionId })
  } catch (error) {
    console.error('Error tracking event:', error)
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

// End session
export async function endSession() {
  if (typeof window === 'undefined') return

  const sessionId = getSessionId()

  try {
    await supabase.rpc('end_user_session', { p_session_id: sessionId })
  } catch (error) {
    console.error('Error ending session:', error)
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
