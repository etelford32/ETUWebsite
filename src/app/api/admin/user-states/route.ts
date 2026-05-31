import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabaseServer'
import { getSession } from '@/lib/session'
import { isStaff } from '@/lib/adminAuth'

/**
 * GET /api/admin/user-states — lifecycle state counts + auth funnel for the
 * admin analytics dashboard. Staff (admin/moderator) only.
 *
 * Query: ?days=7 (auth funnel window, default 7)
 */
export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!(await isStaff(session.userId))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const days = Math.min(Math.max(Number(new URL(request.url).searchParams.get('days')) || 7, 1), 365)
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
  const supabase = createServerClient()

  // Lifecycle state counts
  const { data: stateRows } = await (supabase.from('user_state_counts') as any).select('*')
  const stateCounts: Record<string, number> = {}
  for (const r of stateRows ?? []) stateCounts[r.lifecycle_state] = Number(r.count)

  // Auth funnel: counts per event type within the window
  const eventTypes = [
    'signup',
    'login_success',
    'login_failed',
    'logout',
    'magic_link_requested',
    'magic_link_consumed',
    'password_reset_requested',
    'password_reset_completed',
    'invite_accepted',
    'email_verified',
  ]
  const funnel: Record<string, number> = {}
  await Promise.all(
    eventTypes.map(async (t) => {
      const { count } = await (supabase.from('auth_events') as any)
        .select('*', { count: 'exact', head: true })
        .eq('event_type', t)
        .gte('created_at', since)
      funnel[t] = count ?? 0
    })
  )

  // Recent auth events for the activity feed
  const { data: recentEvents } = await (supabase.from('auth_events') as any)
    .select('id, event_type, method, email, ip_address, created_at, metadata')
    .order('created_at', { ascending: false })
    .limit(25)

  // Pending automations snapshot
  const { data: jobRows } = await (supabase.from('lifecycle_jobs') as any)
    .select('job_type, status')
    .order('created_at', { ascending: false })
    .limit(500)
  const jobs: Record<string, Record<string, number>> = {}
  for (const j of jobRows ?? []) {
    jobs[j.job_type] = jobs[j.job_type] || {}
    jobs[j.job_type][j.status] = (jobs[j.job_type][j.status] || 0) + 1
  }

  return NextResponse.json({
    stateCounts,
    funnel,
    recentEvents: recentEvents ?? [],
    jobs,
    windowDays: days,
  })
}
