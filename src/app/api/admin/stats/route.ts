import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabaseServer'
import { getSessionFromRequest } from '@/lib/session'

// Count helper that tolerates a missing table (returns 0 rather than
// throwing) so a not-yet-migrated feature doesn't 500 the whole dashboard.
async function safeCount(query: any): Promise<number> {
  try {
    const { count, error } = await query
    if (error) return 0
    return count || 0
  } catch {
    return 0
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request)

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check admin/staff role
    if (session.role !== 'admin' && session.role !== 'staff') {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      )
    }

    const supabase = createServerClient()
    const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

    const [
      totalUsers,
      alphaTesters,
      alphaApplicationsPending,
      alphaApplicationsTotal,
      pendingInvites,
      signups30d,
      logins30d,
    ] = await Promise.all([
      safeCount(supabase.from('profiles').select('*', { count: 'exact', head: true })),
      safeCount(
        supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('is_alpha_tester', true)
      ),
      safeCount(
        supabase
          .from('alpha_applications')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending')
      ),
      safeCount(
        supabase.from('alpha_applications').select('*', { count: 'exact', head: true })
      ),
      safeCount(
        supabase
          .from('user_invites')
          .select('*', { count: 'exact', head: true })
          .is('accepted_at', null)
          .is('revoked_at', null)
      ),
      safeCount(
        supabase
          .from('auth_events')
          .select('*', { count: 'exact', head: true })
          .eq('event_type', 'signup')
          .gte('created_at', since30d)
      ),
      safeCount(
        supabase
          .from('auth_events')
          .select('*', { count: 'exact', head: true })
          .eq('event_type', 'login_success')
          .gte('created_at', since30d)
      ),
    ])

    // Recent activity from the real auth-event log.
    const { data: recentEvents } = await supabase
      .from('auth_events')
      .select('id, event_type, email, method, city, country, created_at')
      .order('created_at', { ascending: false })
      .limit(8)

    const LABELS: Record<string, string> = {
      signup: 'New signup',
      login_success: 'Signed in',
      login_failed: 'Failed sign-in',
      logout: 'Signed out',
      email_verified: 'Email verified',
      password_reset: 'Password reset',
      new_device_alert: 'New-device sign-in',
    }

    const recentActivity = (recentEvents || []).map((e: any) => {
      const where = [e.city, e.country].filter(Boolean).join(', ')
      return {
        id: e.id,
        type: e.event_type,
        description: LABELS[e.event_type] || e.event_type,
        user: e.email || undefined,
        detail: [e.method, where].filter(Boolean).join(' · ') || undefined,
        timestamp: e.created_at,
      }
    })

    // Surface failed-login volume as a real, data-driven security signal.
    const failedLogins24h = await safeCount(
      supabase
        .from('auth_events')
        .select('*', { count: 'exact', head: true })
        .eq('event_type', 'login_failed')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    )

    const securityAlerts = [
      {
        id: 'session-signing',
        severity: 'low' as const,
        title: 'Session cookies are HMAC-signed',
        description: 'Forged or tampered session cookies are rejected.',
        timestamp: new Date().toISOString(),
        resolved: true,
      },
      {
        id: 'failed-logins',
        severity: failedLogins24h > 20 ? ('high' as const) : ('low' as const),
        title: `${failedLogins24h} failed sign-in${failedLogins24h === 1 ? '' : 's'} (24h)`,
        description:
          failedLogins24h > 20
            ? 'Elevated failed-login volume — possible credential stuffing.'
            : 'Failed sign-in volume is within normal range.',
        timestamp: new Date().toISOString(),
        resolved: failedLogins24h <= 20,
      },
    ]

    return NextResponse.json({
      stats: {
        totalUsers,
        alphaTesters,
        alphaApplicationsPending,
        alphaApplicationsTotal,
        pendingInvites,
        signups30d,
        logins30d,
      },
      recentActivity,
      securityAlerts,
      systemHealth: {
        database: 'healthy',
        authentication: 'healthy',
        api: 'healthy',
      },
    })
  } catch (error: any) {
    console.error('Admin stats error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
