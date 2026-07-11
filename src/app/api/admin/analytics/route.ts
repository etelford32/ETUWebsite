import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabaseServer'
import { getSessionFromRequest } from '@/lib/session'

const STAFF_ROLES = ['admin', 'staff']

function classifySource(s: any): string {
  if (s.utm_source) return s.utm_source
  const ref: string | null = s.referrer
  if (!ref) return 'Direct'
  try {
    const host = new URL(ref).hostname.replace(/^www\./, '')
    if (/google\.|bing\.|duckduckgo\.|yahoo\./.test(host)) return 'Organic Search'
    if (/t\.co|twitter\.|x\.com|reddit\.|facebook\.|instagram\.|youtube\.|discord\./.test(host)) return 'Social'
    return host
  } catch {
    return 'Referral'
  }
}

// GET /api/admin/analytics?days=7 — aggregated site analytics (staff+)
export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!STAFF_ROLES.includes(session.role || '')) {
    return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
  }

  try {
    const days = Math.min(Math.max(parseInt(request.nextUrl.searchParams.get('days') || '7'), 1), 365)
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
    const supabase = createServerClient()

    const [sessionsRes, eventsRes] = await Promise.all([
      supabase.from('user_sessions').select('*').gte('started_at', since).order('started_at', { ascending: false }),
      supabase.from('analytics_events').select('event_type, page_url, created_at').gte('created_at', since),
    ])

    const sessions: any[] = sessionsRes.data || []
    const events: any[] = eventsRes.data || []
    const pageViews = events.filter((e) => e.event_type === 'page_view' || e.event_type === 'pageview')

    // Summary
    const uniqueUsers = new Set(sessions.map((s) => s.user_id).filter(Boolean))
    const totalDuration = sessions.reduce((a, s) => a + (s.duration_seconds || 0), 0)
    const summary = {
      totalSessions: sessions.length,
      totalPageViews: pageViews.length,
      totalUsers: uniqueUsers.size,
      avgSessionDuration: sessions.length ? Math.round(totalDuration / sessions.length) : 0,
      bounceRate: sessions.length
        ? Math.round((sessions.filter((s) => (s.page_views || 0) <= 1).length / sessions.length) * 100)
        : 0,
    }

    // Time series by day
    const tsMap = new Map<string, { date: string; sessions: number; pageViews: number; users: Set<string> }>()
    for (const s of sessions) {
      const date = new Date(s.started_at).toISOString().split('T')[0]
      const d = tsMap.get(date) || { date, sessions: 0, pageViews: 0, users: new Set<string>() }
      d.sessions++
      d.pageViews += s.page_views || 0
      if (s.user_id) d.users.add(s.user_id)
      tsMap.set(date, d)
    }
    const timeSeriesData = Array.from(tsMap.values())
      .map((d) => ({ date: d.date, sessions: d.sessions, pageViews: d.pageViews, users: d.users.size }))
      .sort((a, b) => a.date.localeCompare(b.date))

    // Top pages
    const pageMap = new Map<string, number>()
    for (const e of pageViews) {
      const url = e.page_url || 'Unknown'
      pageMap.set(url, (pageMap.get(url) || 0) + 1)
    }
    const topPages = Array.from(pageMap.entries())
      .map(([page_url, views]) => ({ page_url, views }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 10)

    // Acquisition sources (real — from utm_source/referrer)
    const srcMap = new Map<string, { sessions: number; users: Set<string> }>()
    for (const s of sessions) {
      const src = classifySource(s)
      const entry = srcMap.get(src) || { sessions: 0, users: new Set<string>() }
      entry.sessions++
      if (s.user_id) entry.users.add(s.user_id)
      srcMap.set(src, entry)
    }
    const acquisitionSources = Array.from(srcMap.entries())
      .map(([source, v]) => ({ source, sessions: v.sessions, users: v.users.size }))
      .sort((a, b) => b.sessions - a.sessions)
      .slice(0, 8)

    // Device breakdown
    const devMap = new Map<string, number>()
    for (const s of sessions) devMap.set(s.device_type || 'Unknown', (devMap.get(s.device_type || 'Unknown') || 0) + 1)
    const denom = sessions.length || 1
    const deviceBreakdown = Array.from(devMap.entries())
      .map(([device_type, count]) => ({ device_type, count, percentage: Math.round((count / denom) * 100) }))
      .sort((a, b) => b.count - a.count)

    const recentSessions = sessions.slice(0, 10).map((s) => ({
      session_id: s.session_id,
      user_id: s.user_id,
      started_at: s.started_at,
      page_views: s.page_views || 0,
      duration_seconds: s.duration_seconds || 0,
      device_type: s.device_type || 'Unknown',
    }))

    return NextResponse.json({
      summary,
      timeSeriesData,
      topPages,
      acquisitionSources,
      deviceBreakdown,
      recentSessions,
    })
  } catch (error: any) {
    console.error('Admin analytics error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
