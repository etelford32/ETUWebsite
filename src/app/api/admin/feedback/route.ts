import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabaseServer'
import { getSessionFromRequest } from '@/lib/session'

const STAFF_ROLES = ['admin', 'staff']
const VALID_STATUS = ['open', 'in_progress', 'resolved', 'closed', 'duplicate']
const VALID_PRIORITY = ['low', 'medium', 'high', 'critical']

async function requireStaff(request: NextRequest) {
  const session = await getSessionFromRequest(request)
  if (!session) return { error: 'Unauthorized', status: 401 as const }
  if (!STAFF_ROLES.includes(session.role || '')) {
    return { error: 'Forbidden - Admin access required', status: 403 as const }
  }
  return { session }
}

// GET /api/admin/feedback — list all feedback with submitter profile (staff+)
export async function GET(request: NextRequest) {
  const gate = await requireStaff(request)
  if ('error' in gate) return NextResponse.json({ error: gate.error }, { status: gate.status })

  try {
    const supabase = createServerClient()
    const { data, error } = await supabase
      .from('feedback')
      .select('*, profile:profiles(username, display_name, email)')
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ feedback: data || [] })
  } catch (error: any) {
    console.error('Admin feedback list error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/admin/feedback — update status/priority (staff+)
export async function PATCH(request: NextRequest) {
  const gate = await requireStaff(request)
  if ('error' in gate) return NextResponse.json({ error: gate.error }, { status: gate.status })

  try {
    const { id, status, priority } = await request.json()
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    const updates: Record<string, any> = {}
    if (status !== undefined) {
      if (!VALID_STATUS.includes(status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
      }
      updates.status = status
      // Stamp resolved_at when moving into a terminal resolved state.
      if (status === 'resolved') updates.resolved_at = new Date().toISOString()
    }
    if (priority !== undefined) {
      if (!VALID_PRIORITY.includes(priority)) {
        return NextResponse.json({ error: 'Invalid priority' }, { status: 400 })
      }
      updates.priority = priority
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const supabase = createServerClient()
    const { data, error } = await (supabase.from('feedback') as any)
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, feedback: data })
  } catch (error: any) {
    console.error('Admin feedback update error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
