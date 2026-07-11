import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabaseServer'
import { getSessionFromRequest } from '@/lib/session'

const STAFF_ROLES = ['admin', 'staff']

// Auth event types that represent a failed/negative security signal.
const FAILURE_EVENTS = ['login_failed']

async function safeCount(query: any): Promise<number> {
  try {
    const { count, error } = await query
    return error ? 0 : count || 0
  } catch {
    return 0
  }
}

// GET /api/admin/security — real security posture from auth_events + config (staff+)
export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!STAFF_ROLES.includes(session.role || '')) {
    return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
  }

  try {
    const supabase = createServerClient()
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    const [failedLoginAttempts, activeAdmins, recentEventsRes, policiesRes] = await Promise.all([
      safeCount(
        supabase
          .from('auth_events')
          .select('*', { count: 'exact', head: true })
          .in('event_type', FAILURE_EVENTS)
          .gte('created_at', since24h)
      ),
      safeCount(
        supabase.from('profiles').select('*', { count: 'exact', head: true }).in('role', STAFF_ROLES)
      ),
      supabase
        .from('auth_events')
        .select('id, event_type, email, ip_address, created_at')
        .order('created_at', { ascending: false })
        .limit(15),
      // Real RLS policy inventory via a SECURITY DEFINER helper (added in
      // migration); falls back to empty if unavailable.
      supabase.rpc('admin_list_rls_policies'),
    ])

    const recentAuthEvents = (recentEventsRes.data || []).map((e: any) => ({
      id: e.id,
      event_type: e.event_type,
      user_email: e.email || '—',
      ip_address: e.ip_address || '—',
      timestamp: e.created_at,
      success: !FAILURE_EVENTS.includes(e.event_type),
    }))

    const rlsPolicies = (policiesRes.data || []).map((p: any) => ({
      table_name: p.table_name,
      policy_name: p.policy_name,
      enabled: p.rls_enabled,
      policy_type: p.command,
    }))

    // Real env-var presence (server-side; never returns the values).
    const envVarsStatus = [
      { name: 'SUPABASE_URL', required: true, configured: !!process.env.SUPABASE_URL },
      { name: 'SUPABASE_SERVICE_ROLE_KEY', required: true, configured: !!process.env.SUPABASE_SERVICE_ROLE_KEY },
      {
        name: 'SESSION_SECRET',
        required: true,
        configured: !!(process.env.SESSION_SECRET || process.env.ETU_SESSION_SECRET),
      },
      { name: 'STEAM_WEB_API_KEY', required: false, configured: !!process.env.STEAM_WEB_API_KEY },
    ]

    // Security score: start at 100, dock for real gaps.
    let securityScore = 100
    if (!envVarsStatus[2].configured) securityScore -= 25 // no dedicated session secret
    if (failedLoginAttempts > 20) securityScore -= 20
    if (activeAdmins === 0) securityScore -= 15
    if (rlsPolicies.length === 0) securityScore -= 10
    securityScore = Math.max(0, securityScore)

    return NextResponse.json({
      failedLoginAttempts,
      activeAdmins,
      recentAuthEvents,
      rlsPolicies,
      envVarsStatus,
      securityScore,
    })
  } catch (error: any) {
    console.error('Admin security error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
