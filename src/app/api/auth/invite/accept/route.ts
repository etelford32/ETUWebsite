import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabaseServer'
import { setSessionOnResponse } from '@/lib/session'
import { validatePassword } from '@/lib/passwordValidation'

// POST /api/auth/invite/accept — consume an invite and create the account
export async function POST(request: NextRequest) {
  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const token = (body.token || '').toString()
  const password = (body.password || '').toString()
  const username = body.username ? String(body.username).trim().slice(0, 32) : ''

  if (!token) {
    return NextResponse.json({ error: 'Missing invite token' }, { status: 400 })
  }

  const passwordCheck = validatePassword(password)
  if (!passwordCheck.valid) {
    return NextResponse.json(
      { error: 'Password does not meet requirements', details: passwordCheck.errors },
      { status: 400 }
    )
  }

  const supabase = createServerClient()

  const { data: invite, error: lookupError } = await (supabase as any)
    .from('user_invites')
    .select('*')
    .eq('token', token)
    .maybeSingle()

  if (lookupError || !invite) {
    return NextResponse.json({ error: 'Invitation not found' }, { status: 404 })
  }
  if (invite.accepted_at) {
    return NextResponse.json({ error: 'Invitation already used' }, { status: 410 })
  }
  if (invite.revoked_at) {
    return NextResponse.json({ error: 'Invitation revoked' }, { status: 410 })
  }
  if (new Date(invite.expires_at).getTime() < Date.now()) {
    return NextResponse.json({ error: 'Invitation expired' }, { status: 410 })
  }

  // Create the auth user with the invited email
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: invite.email,
    password,
    email_confirm: true,
    user_metadata: {
      username: username || invite.email.split('@')[0],
      invited_by: invite.invited_by_email,
    },
  })

  if (authError || !authData.user) {
    console.error('Invite accept createUser error:', authError)
    return NextResponse.json(
      { error: authError?.message || 'Failed to create account' },
      { status: 400 }
    )
  }

  // Wait for the profile trigger to create the row, then patch in role + username.
  let profileReady = false
  for (let i = 0; i < 10 && !profileReady; i++) {
    await new Promise((r) => setTimeout(r, 200))
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', authData.user.id)
      .single()
    if (profile) profileReady = true
  }

  const profileUpdate: Record<string, any> = { role: invite.role }
  if (username) profileUpdate.username = username

  const { error: updateError } = await (supabase.from('profiles') as any)
    .update(profileUpdate)
    .eq('id', authData.user.id)

  if (updateError) {
    console.warn('Invite accept profile update warning:', updateError.message)
  }

  // Mark invite consumed
  await (supabase as any)
    .from('user_invites')
    .update({
      accepted_at: new Date().toISOString(),
      accepted_user_id: authData.user.id,
    })
    .eq('id', invite.id)

  const response = NextResponse.json({
    success: true,
    user: {
      id: authData.user.id,
      email: authData.user.email,
      role: invite.role,
    },
  })

  setSessionOnResponse(response, authData.user.id, authData.user.email!, invite.role)
  return response
}
