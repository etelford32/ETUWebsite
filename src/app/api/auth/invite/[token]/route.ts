import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabaseServer'

// GET /api/auth/invite/:token — validate an invite token (public)
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params

  if (!token || token.length < 16) {
    return NextResponse.json({ error: 'Invalid invite token' }, { status: 400 })
  }

  const supabase = createServerClient()
  const { data: invite, error } = await (supabase as any)
    .from('user_invites')
    .select('id, email, role, expires_at, accepted_at, revoked_at, message, invited_by_email')
    .eq('token', token)
    .maybeSingle()

  if (error) {
    console.error('Lookup invite error:', error)
    return NextResponse.json({ error: 'Failed to look up invite' }, { status: 500 })
  }

  if (!invite) {
    return NextResponse.json({ error: 'Invitation not found' }, { status: 404 })
  }

  if (invite.accepted_at) {
    return NextResponse.json({ error: 'This invitation has already been used' }, { status: 410 })
  }
  if (invite.revoked_at) {
    return NextResponse.json({ error: 'This invitation has been revoked' }, { status: 410 })
  }
  if (new Date(invite.expires_at).getTime() < Date.now()) {
    return NextResponse.json({ error: 'This invitation has expired' }, { status: 410 })
  }

  return NextResponse.json({
    invite: {
      email: invite.email,
      role: invite.role,
      message: invite.message,
      invitedBy: invite.invited_by_email,
      expiresAt: invite.expires_at,
    },
  })
}
