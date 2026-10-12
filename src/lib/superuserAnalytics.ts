import { createServerClient } from './supabaseServer'

/**
 * Site traffic and account metrics for the superuser console.
 *
 * Sources (all written server-side by the /api/analytics/* and /api/auth/* routes):
 *  - user_sessions     one row per browser tab session ("visit")
 *  - analytics_events  page_view rows, attributed to the signed-in user if any
 *  - auth_events       signup / login_success / password_reset_* funnel
 *  - profiles          account roles and creation dates
 *
 * Counted per calendar period (today / this week / this month) whose start
 * instants the caller supplies, so the boundaries follow the viewer's timezone.
 */

export type PeriodKey = 'today' | 'week' | 'month'
export const PERIOD_KEYS: PeriodKey[] = ['today', 'week', 'month']

export interface PeriodMetrics {
  visits: number
  uniqueVisitors: number
  pageViews: number
  adminVisits: number
  activeUsers: number
  newUsers: number
  returningUsers: number
  minutesPerVisitor: number
  pagesPerVisitor: number
  signIns: number
  signUps: number
  passwordResetsRequested: number
  passwordResetsCompleted: number
  profileVisits: number
  publicProfileVisits: number
}

export interface DailyPoint {
  date: string // YYYY-MM-DD in the viewer's timezone
  visits: number
  uniqueVisitors: number
  pageViews: number
}

export interface SiteAnalytics {
  periods: Record<PeriodKey, PeriodMetrics>
  daily: DailyPoint[]
  totals: { accounts: number; admins: number }
  generatedAt: string
}

const ADMIN_ROLES = ['admin', 'staff', 'moderator']
// A tab left open overnight shouldn't count as eight hours of reading.
const MAX_SESSION_SECONDS = 3 * 60 * 60
const PAGE_SIZE = 1000
// Crawlers, link unfurlers and uptime checkers run our client JS too.
const BOT_UA = /bot|spider|crawl|slurp|headless|lighthouse|preview|facebookexternalhit|^google$|python|curl|wget|monitor/i

type Supabase = ReturnType<typeof createServerClient>

/** Page through a query past PostgREST's 1000-row response cap. */
async function fetchAll<T>(build: (from: number, to: number) => any): Promise<T[]> {
  const rows: T[] = []
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await build(from, from + PAGE_SIZE - 1)
    if (error) throw error
    rows.push(...(data || []))
    if (!data || data.length < PAGE_SIZE) return rows
  }
}

/**
 * One key per browser: the persistent visitor ID when the client sent one,
 * else the signed-in account, else IP + user agent (older rows, blocked storage).
 */
function visitorKey(visitorId: unknown, userId: string | null, ip: string | null, ua: string | null) {
  if (typeof visitorId === 'string' && visitorId) return `v:${visitorId}`
  if (userId) return `u:${userId}`
  return `a:${ip || '?'}|${ua || '?'}`
}

export async function getSiteAnalytics(
  starts: Record<PeriodKey, Date>,
  timeZone: string
): Promise<SiteAnalytics> {
  const supabase: Supabase = createServerClient()
  const since = new Date(Math.min(...PERIOD_KEYS.map((k) => starts[k].getTime()))).toISOString()

  const [allSessions, allPageViews, authEvents, profiles] = await Promise.all([
    fetchAll<any>((a, b) =>
      (supabase.from('user_sessions') as any)
        .select('session_id, user_id, started_at, ended_at, duration_seconds, ip_address, metadata')
        .gte('started_at', since)
        .order('started_at', { ascending: true })
        .range(a, b)
    ),
    fetchAll<any>((a, b) =>
      (supabase.from('analytics_events') as any)
        .select('session_id, user_id, page_url, ip_address, user_agent, metadata, created_at')
        .eq('event_type', 'page_view')
        .gte('created_at', since)
        .order('created_at', { ascending: true })
        .range(a, b)
    ),
    fetchAll<any>((a, b) =>
      (supabase.from('auth_events') as any)
        .select('event_type, created_at')
        .in('event_type', ['signup', 'login_success', 'password_reset_requested', 'password_reset_completed'])
        .gte('created_at', since)
        .order('created_at', { ascending: true })
        .range(a, b)
    ),
    fetchAll<any>((a, b) =>
      (supabase.from('profiles') as any)
        .select('id, role, is_superuser, created_at')
        .order('id', { ascending: true })
        .range(a, b)
    ),
  ])

  const sessions = allSessions.filter((s) => !BOT_UA.test(s.metadata?.user_agent || ''))
  const pageViews = allPageViews.filter((ev) => !BOT_UA.test(ev.user_agent || ''))

  // Resolve each visit to one visitor key up front: crawler farms and mobile
  // networks change IP mid-visit, which would otherwise split it in two.
  const sessionVisitor = new Map<string, string>()
  for (const s of sessions) {
    sessionVisitor.set(s.session_id, visitorKey(s.metadata?.visitor_id, s.user_id, s.ip_address, s.metadata?.user_agent ?? null))
  }
  for (const ev of pageViews) {
    if (!sessionVisitor.has(ev.session_id)) {
      sessionVisitor.set(ev.session_id, visitorKey(ev.metadata?.visitor_id, ev.user_id, ev.ip_address, ev.user_agent))
    }
  }

  const accountCreated = new Map<string, number>()
  const adminIds = new Set<string>()
  for (const p of profiles) {
    accountCreated.set(p.id, new Date(p.created_at).getTime())
    if (p.is_superuser || ADMIN_ROLES.includes(p.role)) adminIds.add(p.id)
  }

  // Page views carry the user from the session cookie at view time, so they
  // catch sign-ins that happen partway through a visit; the session row's
  // user_id is only set when the visit starts.
  const sessionUsers = new Map<string, Set<string>>()
  const lastViewAt = new Map<string, number>()
  for (const ev of pageViews) {
    const t = new Date(ev.created_at).getTime()
    lastViewAt.set(ev.session_id, Math.max(lastViewAt.get(ev.session_id) || 0, t))
    if (ev.user_id) {
      if (!sessionUsers.has(ev.session_id)) sessionUsers.set(ev.session_id, new Set())
      sessionUsers.get(ev.session_id)!.add(ev.user_id)
    }
  }

  const dayKey = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' })
  const daily = new Map<string, { visits: Set<string>; visitors: Set<string>; pageViews: number }>()
  const day = (iso: string) => {
    const key = dayKey.format(new Date(iso))
    if (!daily.has(key)) daily.set(key, { visits: new Set(), visitors: new Set(), pageViews: 0 })
    return daily.get(key)!
  }

  const periods = {} as Record<PeriodKey, PeriodMetrics>
  for (const key of PERIOD_KEYS) {
    const start = starts[key].getTime()
    const visitors = new Set<string>()
    const activeUsers = new Set<string>()
    // A visit is any session seen in the period, from either source, so a
    // visit that crosses midnight or whose session row failed to save counts.
    const visitUsers = new Map<string, Set<string>>()
    const visitUsersOf = (sessionId: string) => {
      if (!visitUsers.has(sessionId)) visitUsers.set(sessionId, new Set())
      return visitUsers.get(sessionId)!
    }
    let engagedSeconds = 0

    for (const s of sessions) {
      const startedAt = new Date(s.started_at).getTime()
      if (startedAt < start) continue
      const users = visitUsersOf(s.session_id)
      if (s.user_id) users.add(s.user_id)
      sessionUsers.get(s.session_id)?.forEach((u) => users.add(u))
      visitors.add(sessionVisitor.get(s.session_id)!)

      // end_user_session only records the first time the tab is hidden, so
      // also credit time up to the visit's last page view.
      const ended = s.ended_at ? new Date(s.ended_at).getTime() : 0
      const lastSeen = Math.max(ended, lastViewAt.get(s.session_id) || 0, startedAt)
      engagedSeconds += Math.min(Math.max(s.duration_seconds || 0, (lastSeen - startedAt) / 1000), MAX_SESSION_SECONDS)
    }

    let views = 0
    let profileVisits = 0
    let publicProfileVisits = 0
    for (const ev of pageViews) {
      if (new Date(ev.created_at).getTime() < start) continue
      views++
      const users = visitUsersOf(ev.session_id)
      if (ev.user_id) users.add(ev.user_id)
      visitors.add(sessionVisitor.get(ev.session_id)!)
      const path: string = ev.page_url || ''
      if (path === '/profile' || path.startsWith('/profile/') || path.startsWith('/profile?')) {
        profileVisits++
        if (path.startsWith('/profile/')) publicProfileVisits++
      }
    }

    let adminVisits = 0
    visitUsers.forEach((users) => {
      users.forEach((u) => activeUsers.add(u))
      if (Array.from(users).some((u) => adminIds.has(u))) adminVisits++
    })

    let newUsers = 0
    activeUsers.forEach((u) => {
      if ((accountCreated.get(u) ?? 0) >= start) newUsers++
    })

    const counts = { signup: 0, login_success: 0, password_reset_requested: 0, password_reset_completed: 0 } as Record<string, number>
    for (const ev of authEvents) {
      if (new Date(ev.created_at).getTime() >= start) counts[ev.event_type]++
    }

    const uniqueVisitors = visitors.size
    periods[key] = {
      visits: visitUsers.size,
      uniqueVisitors,
      pageViews: views,
      adminVisits,
      activeUsers: activeUsers.size,
      newUsers,
      returningUsers: activeUsers.size - newUsers,
      minutesPerVisitor: uniqueVisitors ? engagedSeconds / 60 / uniqueVisitors : 0,
      pagesPerVisitor: uniqueVisitors ? views / uniqueVisitors : 0,
      signIns: counts.login_success,
      signUps: counts.signup,
      passwordResetsRequested: counts.password_reset_requested,
      passwordResetsCompleted: counts.password_reset_completed,
      profileVisits,
      publicProfileVisits,
    }
  }

  const monthStart = starts.month.getTime()
  for (const s of sessions) {
    if (new Date(s.started_at).getTime() < monthStart) continue
    const d = day(s.started_at)
    d.visits.add(s.session_id)
    d.visitors.add(sessionVisitor.get(s.session_id)!)
  }
  for (const ev of pageViews) {
    if (new Date(ev.created_at).getTime() < monthStart) continue
    const d = day(ev.created_at)
    d.pageViews++
    d.visits.add(ev.session_id)
    d.visitors.add(sessionVisitor.get(ev.session_id)!)
  }

  return {
    periods,
    daily: Array.from(daily.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, d]) => ({ date, visits: d.visits.size, uniqueVisitors: d.visitors.size, pageViews: d.pageViews })),
    totals: { accounts: profiles.length, admins: adminIds.size },
    generatedAt: new Date().toISOString(),
  }
}
