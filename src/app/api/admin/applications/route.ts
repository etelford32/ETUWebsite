import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabaseServer'
import { getSessionFromRequest } from '@/lib/session'
import {
  APPLICATION_STATUSES,
  fetchApplications,
  fromAlpha,
  fromCareer,
  type ApplicationKind,
} from '@/lib/adminApplications'

const STAFF_ROLES = ['admin', 'staff']

async function requireStaff(request: NextRequest) {
  const session = await getSessionFromRequest(request)
  if (!session) return { error: 'Unauthorized', status: 401 as const }
  if (!STAFF_ROLES.includes(session.role || '') && !session.isSuperuser) {
    return { error: 'Forbidden - Admin access required', status: 403 as const }
  }
  return { session }
}

// GET /api/admin/applications?limit=500 — alpha + career applications (staff+)
export async function GET(request: NextRequest) {
  const gate = await requireStaff(request)
  if ('error' in gate) return NextResponse.json({ error: gate.error }, { status: gate.status })

  try {
    const limitParam = parseInt(request.nextUrl.searchParams.get('limit') || '500', 10)
    const limit = Math.min(Math.max(Number.isFinite(limitParam) ? limitParam : 500, 1), 1000)
    const applications = await fetchApplications(createServerClient(), limit)
    return NextResponse.json({ applications })
  } catch (error: any) {
    console.error('Admin applications list error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/admin/applications — update an application's status (staff+)
export async function PATCH(request: NextRequest) {
  const gate = await requireStaff(request)
  if ('error' in gate) return NextResponse.json({ error: gate.error }, { status: gate.status })

  try {
    const { id, kind, status } = await request.json()
    if (!id || !kind) {
      return NextResponse.json({ error: 'id and kind are required' }, { status: 400 })
    }
    if (!(kind in APPLICATION_STATUSES)) {
      return NextResponse.json({ error: 'Invalid kind' }, { status: 400 })
    }
    if (!(APPLICATION_STATUSES[kind as ApplicationKind] as readonly string[]).includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    const table = kind === 'alpha' ? 'alpha_applications' : 'career_applications'
    const supabase = createServerClient()
    const { data, error } = await (supabase.from(table) as any)
      .update({ status })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const application = kind === 'alpha' ? fromAlpha(data) : fromCareer(data)
    return NextResponse.json({ success: true, application })
  } catch (error: any) {
    console.error('Admin application update error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
