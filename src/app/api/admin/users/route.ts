import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabaseServer'
import { getSessionFromRequest } from '@/lib/session'

const STAFF_ROLES = ['admin', 'staff']
const ASSIGNABLE_ROLES = ['admin', 'staff', 'user']

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
        'id, email, username, display_name, role, avatar_url, created_at, last_login_at, login_count, steam_id, faction_choice, level, xp, is_alpha_tester, status'
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

// PATCH /api/admin/users — change a user's role (admin only)
export async function PATCH(request: NextRequest) {
  const gate = await requireStaff(request)
  if ('error' in gate) return NextResponse.json({ error: gate.error }, { status: gate.status })

  // Only full admins may change roles (staff can view but not promote).
  if (gate.session.role !== 'admin') {
    return NextResponse.json({ error: 'Only admins can change roles' }, { status: 403 })
  }

  try {
    const { userId, role } = await request.json()

    if (!userId || !role) {
      return NextResponse.json({ error: 'userId and role are required' }, { status: 400 })
    }
    if (!ASSIGNABLE_ROLES.includes(role)) {
      return NextResponse.json(
        { error: `Invalid role. Must be one of: ${ASSIGNABLE_ROLES.join(', ')}` },
        { status: 400 }
      )
    }
    // Guard: an admin can't strip their own admin rights (avoids locking the
    // last admin out of the panel).
    if (userId === gate.session.userId && role !== 'admin') {
      return NextResponse.json(
        { error: "You can't remove your own admin role." },
        { status: 400 }
      )
    }

    const supabase = createServerClient()
    const { data, error } = await (supabase.from('profiles') as any)
      .update({ role })
      .eq('id', userId)
      .select('id, role')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, user: data })
  } catch (error: any) {
    console.error('Admin role update error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
