import { NextRequest, NextResponse } from 'next/server'
import type { User } from '@supabase/supabase-js'
import { createServerClient } from '@/lib/supabaseServer'
import { requireSuperuser, type SessionData } from '@/lib/session'
import { validateCSRFToken } from '@/lib/csrf'

/**
 * Superuser console API — manage every account, administrators included.
 *
 * Every call re-reads the caller's superuser flag from the database
 * (requireSuperuser), and every change is written to admin_audit_log.
 */

const ROLES = ['user', 'moderator', 'staff', 'admin'] as const
const STATUSES = ['active', 'suspended', 'banned'] as const
// Supabase has no "forever" ban; 100 years is its documented stand-in.
const BAN_DURATION = '876000h'

type Gate = { session: SessionData } | { response: NextResponse }

async function gate(request: NextRequest, checkCsrf: boolean): Promise<Gate> {
  let session: SessionData
  try {
    session = await requireSuperuser(request)
  } catch (error: any) {
    const status = String(error?.message).startsWith('Unauthorized') ? 401 : 403
    return { response: NextResponse.json({ error: error.message }, { status }) }
  }
  if (checkCsrf && !validateCSRFToken(request.headers.get('x-csrf-token'), session.csrfToken ?? null)) {
    return { response: NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 }) }
  }
  return { session }
}

async function listAllAuthUsers(supabase: ReturnType<typeof createServerClient>): Promise<User[]> {
  const perPage = 1000
  const all: User[] = []
  for (let page = 1; ; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage })
    if (error) throw error
    all.push(...data.users)
    if (data.users.length < perPage) return all
  }
}

async function audit(
  supabase: ReturnType<typeof createServerClient>,
  actor: SessionData,
  target: { id: string; email: string | null },
  action: string,
  details: Record<string, unknown>
) {
  const { error } = await (supabase.from('admin_audit_log') as any).insert({
    actor_id: actor.userId,
    actor_email: actor.email,
    target_id: target.id,
    target_email: target.email,
    action,
    details,
  })
  if (error) console.error('Audit log insert failed:', error)
}

// GET /api/admin/superuser — every account plus the recent audit trail
export async function GET(request: NextRequest) {
  const g = await gate(request, false)
  if ('response' in g) return g.response

  try {
    const supabase = createServerClient()
    const [authUsers, profilesRes, auditRes] = await Promise.all([
      listAllAuthUsers(supabase),
      (supabase.from('profiles') as any).select(
        'id, email, username, display_name, role, status, is_superuser, is_alpha_tester, steam_id, created_at, last_login_at, login_count'
      ),
      (supabase.from('admin_audit_log') as any)
        .select('id, created_at, actor_email, target_email, action, details')
        .order('created_at', { ascending: false })
        .limit(50),
    ])
    if (profilesRes.error) throw profilesRes.error

    const profiles = new Map<string, any>((profilesRes.data || []).map((p: any) => [p.id, p]))
    const users = authUsers.map((u) => {
      const p = profiles.get(u.id) || {}
      return {
        id: u.id,
        email: u.email || p.email || null,
        username: p.username ?? null,
        displayName: p.display_name ?? null,
        role: p.role || 'user',
        status: p.status || 'active',
        isSuperuser: p.is_superuser === true,
        isAlphaTester: p.is_alpha_tester === true,
        steamId: p.steam_id ?? null,
        providers: (u.app_metadata?.providers as string[] | undefined) || [],
        emailConfirmed: Boolean(u.email_confirmed_at),
        bannedUntil: (u as any).banned_until ?? null,
        createdAt: u.created_at,
        lastSignInAt: p.last_login_at || u.last_sign_in_at || null,
        loginCount: p.login_count ?? 0,
        hasProfile: profiles.has(u.id),
      }
    })
    users.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))

    return NextResponse.json({
      me: g.session.userId,
      users,
      audit: auditRes.error ? [] : auditRes.data || [],
    })
  } catch (error: any) {
    console.error('Superuser list error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/admin/superuser — { userId, action, value }
//   action: 'set_role' | 'set_status' | 'set_superuser' | 'set_alpha'
export async function PATCH(request: NextRequest) {
  const g = await gate(request, true)
  if ('response' in g) return g.response
  const actor = g.session

  try {
    const { userId, action, value } = await request.json()
    if (typeof userId !== 'string' || typeof action !== 'string') {
      return NextResponse.json({ error: 'userId and action are required' }, { status: 400 })
    }
    const isSelf = userId === actor.userId

    const supabase = createServerClient()
    const { data: authData, error: authErr } = await supabase.auth.admin.getUserById(userId)
    if (authErr || !authData?.user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    const { data: target } = await (supabase.from('profiles') as any)
      .select('role, status, is_superuser, is_alpha_tester')
      .eq('id', userId)
      .maybeSingle()
    if (!target) {
      return NextResponse.json({ error: 'User has no profile row' }, { status: 409 })
    }
    const targetRef = { id: userId, email: authData.user.email ?? null }

    let updates: Record<string, unknown>
    switch (action) {
      case 'set_role': {
        if (!ROLES.includes(value)) {
          return NextResponse.json({ error: `Role must be one of: ${ROLES.join(', ')}` }, { status: 400 })
        }
        if (target.is_superuser && value !== 'admin') {
          return NextResponse.json(
            { error: 'Superusers are always admins. Remove superuser first.' },
            { status: 400 }
          )
        }
        updates = { role: value }
        break
      }
      case 'set_status': {
        if (!STATUSES.includes(value)) {
          return NextResponse.json({ error: `Status must be one of: ${STATUSES.join(', ')}` }, { status: 400 })
        }
        if (isSelf && value !== 'active') {
          return NextResponse.json({ error: "You can't suspend your own account." }, { status: 400 })
        }
        if (target.is_superuser && value !== 'active') {
          return NextResponse.json({ error: 'Remove superuser before suspending this account.' }, { status: 400 })
        }
        // Ban in Supabase Auth too, so password, Google and magic-link
        // sign-ins are refused before they reach our session cookie.
        const { error } = await supabase.auth.admin.updateUserById(userId, {
          ban_duration: value === 'active' ? 'none' : BAN_DURATION,
        } as any)
        if (error) throw error
        updates = { status: value }
        break
      }
      case 'set_superuser': {
        if (typeof value !== 'boolean') {
          return NextResponse.json({ error: 'value must be true or false' }, { status: 400 })
        }
        // Self-removal is blocked, so the caller always remains a superuser.
        if (isSelf && !value) {
          return NextResponse.json({ error: "You can't remove your own superuser access." }, { status: 400 })
        }
        if (value && target.status !== 'active') {
          return NextResponse.json({ error: 'Reactivate the account first.' }, { status: 400 })
        }
        updates = value ? { is_superuser: true, role: 'admin' } : { is_superuser: false }
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

    if (isSelf && 'role' in updates && updates.role !== 'admin') {
      return NextResponse.json({ error: "You can't remove your own admin role." }, { status: 400 })
    }

    const { error: updateErr } = await (supabase.from('profiles') as any).update(updates).eq('id', userId)
    if (updateErr) throw updateErr

    await audit(supabase, actor, targetRef, action, {
      value,
      before: {
        role: target.role,
        status: target.status,
        is_superuser: target.is_superuser,
        is_alpha_tester: target.is_alpha_tester,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Superuser update error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/admin/superuser?userId=... — permanently delete an account
export async function DELETE(request: NextRequest) {
  const g = await gate(request, true)
  if ('response' in g) return g.response
  const actor = g.session

  const userId = request.nextUrl.searchParams.get('userId')
  if (!userId) return NextResponse.json({ error: 'userId is required' }, { status: 400 })
  if (userId === actor.userId) {
    return NextResponse.json({ error: "You can't delete your own account here." }, { status: 400 })
  }

  try {
    const supabase = createServerClient()
    const { data: authData, error: authErr } = await supabase.auth.admin.getUserById(userId)
    if (authErr || !authData?.user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    const { data: target } = await (supabase.from('profiles') as any)
      .select('is_superuser')
      .eq('id', userId)
      .maybeSingle()
    if (target?.is_superuser) {
      return NextResponse.json({ error: 'Remove superuser before deleting this account.' }, { status: 400 })
    }

    // profiles cascades from auth.users.
    const { error } = await supabase.auth.admin.deleteUser(userId)
    if (error) throw error

    await audit(supabase, actor, { id: userId, email: authData.user.email ?? null }, 'delete_user', {})
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Superuser delete error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
