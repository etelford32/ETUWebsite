import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabaseServer'
import { getSessionFromRequest, type SessionData } from '@/lib/session'
import { validateCSRFToken } from '@/lib/csrf'
import { ADMIN_ASSIGNABLE_ROLES, isRole } from '@/lib/accountTiers'
import { writeAdminAudit } from '@/lib/adminAudit'

const STAFF_ROLES = ['admin', 'staff']

async function requireStaff(request: NextRequest) {
  const session = await getSessionFromRequest(request)
  if (!session) return { error: 'Unauthorized', status: 401 as const }
  if (!STAFF_ROLES.includes(session.role || '')) {
    return { error: 'Forbidden - Admin access required', status: 403 as const }
  }
  return { session }
}

// GET /api/admin/users — list all profiles (staff+)
export async function GET(request: NextRequest) {
  const gate = await requireStaff(request)
  if ('error' in gate) return NextResponse.json({ error: gate.error }, { status: gate.status })

  try {
    const supabase = createServerClient()
    const { data, error } = await supabase
      .from('profiles')
      .select(
        'id, email, username, display_name, role, tier, avatar_url, created_at, last_login_at, login_count, steam_id, is_verified_owner, faction_choice, level, xp, is_alpha_tester, is_superuser, status'
      )
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ users: data || [] })
  } catch (error: any) {
    console.error('Admin users list error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

/**
 * PATCH /api/admin/users — admins only.
 *
 *   { userId, role }                         change a role
 *   { userId, action: 'set_alpha', value }   grant / remove alpha access
 *
 * Roles drive the account tier (TIER-01, see lib/accountTiers): `dev` puts
 * an account on the dev build channel, `staff` / `moderator` and the alpha
 * flag on the alpha channel. Admins may assign user, moderator, staff and
 * dev; granting or changing `admin` (and anything about a superuser) stays
 * in the superuser console. Every change is CSRF-checked and written to
 * admin_audit_log, the same as the superuser console.
 */
export async function PATCH(request: NextRequest) {
  const gate = await requireStaff(request)
  if ('error' in gate) return NextResponse.json({ error: gate.error }, { status: gate.status })
  const actor: SessionData = gate.session

  // Only full admins may change access (staff can view but not promote).
  if (actor.role !== 'admin') {
    return NextResponse.json({ error: 'Only admins can change roles or alpha access' }, { status: 403 })
  }
  if (!validateCSRFToken(request.headers.get('x-csrf-token'), actor.csrfToken ?? null)) {
    return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const userId = body?.userId
    const action: string = body?.action ?? 'set_role'
    const value = action === 'set_role' ? body?.role ?? body?.value : body?.value

    if (typeof userId !== 'string' || !userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }

    const supabase = createServerClient()
    const { data: target } = await (supabase.from('profiles') as any)
      .select('email, role, tier, is_superuser, is_alpha_tester')
      .eq('id', userId)
      .maybeSingle()
    if (!target) {
      return NextResponse.json({ error: 'User has no profile row' }, { status: 404 })
    }

    let updates: Record<string, unknown>
    switch (action) {
      case 'set_role': {
        if (!isRole(value)) {
          return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
        }
        // Administrators are managed from the superuser console: only a
        // superuser may grant admin, or change an existing admin or superuser.
        const touchesAdmin = value === 'admin' || target.role === 'admin' || target.is_superuser
        if (touchesAdmin && !actor.isSuperuser) {
          return NextResponse.json(
            { error: 'Only a superuser can grant or change admin access' },
            { status: 403 }
          )
        }
        if (!actor.isSuperuser && !ADMIN_ASSIGNABLE_ROLES.includes(value)) {
          return NextResponse.json(
            { error: `Admins can assign: ${ADMIN_ASSIGNABLE_ROLES.join(', ')}` },
            { status: 400 }
          )
        }
        if (target.is_superuser && value !== 'admin') {
          return NextResponse.json(
            { error: 'Superusers are always admins. Remove superuser in the superuser console first.' },
            { status: 400 }
          )
        }
        // Guard: an admin can't strip their own admin rights (avoids locking
        // the last admin out of the panel).
        if (userId === actor.userId && value !== 'admin') {
          return NextResponse.json({ error: "You can't remove your own admin role." }, { status: 400 })
        }
        updates = { role: value }
        break
      }
      case 'set_alpha': {
        if (typeof value !== 'boolean') {
          return NextResponse.json({ error: 'value must be true or false' }, { status: 400 })
        }
        updates = { is_alpha_tester: value }
        break
      }
      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
    }

    const { data, error } = await (supabase.from('profiles') as any)
      .update(updates)
      .eq('id', userId)
      .select('id, role, tier, is_alpha_tester')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    await writeAdminAudit(supabase, actor, { id: userId, email: target.email ?? null }, action, {
      value,
      source: 'admin_console',
      before: { role: target.role, tier: target.tier, is_alpha_tester: target.is_alpha_tester },
      after: { role: data.role, tier: data.tier, is_alpha_tester: data.is_alpha_tester },
    })

    return NextResponse.json({ success: true, user: data })
  } catch (error: any) {
    console.error('Admin access update error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
