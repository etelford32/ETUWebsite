import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabaseServer'
import { getSessionFromRequest } from '@/lib/session'
import { isAdmin } from '@/lib/adminAuth'

// DELETE /api/admin/invites/:id — revoke a pending invite
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = getSessionFromRequest(request)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!(await isAdmin(session.userId))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const supabase = createServerClient()

  const { error } = await (supabase as any)
    .from('user_invites')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', id)
    .is('accepted_at', null)

  if (error) {
    console.error('Revoke invite error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
