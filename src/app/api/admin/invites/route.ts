import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { createServerClient } from '@/lib/supabaseServer'
import { getSessionFromRequest } from '@/lib/session'
import { isAdmin } from '@/lib/adminAuth'
import { sendInviteEmail } from '@/lib/inviteEmail'

const VALID_ROLES = new Set(['user', 'admin', 'moderator'])

function siteUrl(request: NextRequest): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    request.nextUrl.origin ||
    'http://localhost:3000'
  )
}

// GET /api/admin/invites — list invites (admin only)
export async function GET(request: NextRequest) {
  const session = getSessionFromRequest(request)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!(await isAdmin(session.userId))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const supabase = createServerClient()
  const { data, error } = await (supabase as any)
    .from('user_invites')
    .select(
      'id, email, role, invited_by_email, message, expires_at, accepted_at, revoked_at, created_at'
    )
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) {
    console.error('List invites error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const now = Date.now()
  const invites = (data || []).map((inv: any) => ({
    ...inv,
    status: inv.accepted_at
      ? 'accepted'
      : inv.revoked_at
      ? 'revoked'
      : new Date(inv.expires_at).getTime() < now
      ? 'expired'
      : 'pending',
  }))

  return NextResponse.json({ invites })
}

// POST /api/admin/invites — create + email a new invite
export async function POST(request: NextRequest) {
  const session = getSessionFromRequest(request)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!(await isAdmin(session.userId))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const emailRaw = (body.email || '').toString().trim().toLowerCase()
  const role = (body.role || 'user').toString()
  const message = body.message ? String(body.message).slice(0, 500) : null

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailRaw)) {
    return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
  }
  if (!VALID_ROLES.has(role)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
  }

  const supabase = createServerClient()

  // Reject if a user with this email already exists
  const { data: existing } = await supabase.auth.admin.listUsers()
  const userExists = existing?.users?.some(
    (u) => u.email?.toLowerCase() === emailRaw
  )
  if (userExists) {
    return NextResponse.json(
      { error: 'A user with that email already exists' },
      { status: 409 }
    )
  }

  // Revoke any prior unaccepted invites for this email so the unique
  // partial index doesn't block a fresh send.
  await (supabase as any)
    .from('user_invites')
    .update({ revoked_at: new Date().toISOString() })
    .ilike('email', emailRaw)
    .is('accepted_at', null)
    .is('revoked_at', null)

  const token = crypto.randomBytes(32).toString('base64url')
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

  const { data: invite, error: insertError } = await (supabase as any)
    .from('user_invites')
    .insert({
      email: emailRaw,
      token,
      role,
      invited_by: session.userId,
      invited_by_email: session.email,
      message,
      expires_at: expiresAt,
    })
    .select('id, email, role, expires_at, created_at')
    .single()

  if (insertError || !invite) {
    console.error('Create invite error:', insertError)
    return NextResponse.json(
      { error: insertError?.message || 'Failed to create invite' },
      { status: 500 }
    )
  }

  const inviteUrl = `${siteUrl(request)}/invite/${token}`
  const emailResult = await sendInviteEmail({
    email: emailRaw,
    inviteUrl,
    inviterName: session.email,
    message: message || undefined,
    role,
  })

  return NextResponse.json({
    success: true,
    invite: { ...invite, status: 'pending' },
    emailSent: emailResult.sent,
    debugUrl: emailResult.debugUrl,
    warning: emailResult.error,
  })
}
