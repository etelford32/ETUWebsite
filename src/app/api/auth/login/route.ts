import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabaseServer'
import { setSessionOnResponse } from '@/lib/session'
import { RateLimiters, getEmailIdentifier } from '@/lib/ratelimit'
import { resolveEmailFromInput } from '@/lib/resolveEmail'
import { recordAuthEvent, getClientInfo } from '@/lib/authEvents'
import { enqueueLifecycleJob } from '@/lib/lifecycle'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    // Accept either the legacy `email` field or the new `emailOrUsername` field
    const { email: legacyEmail, emailOrUsername, password } = body
    const input = (emailOrUsername || legacyEmail || '').trim()

    if (!input || !password) {
      return NextResponse.json(
        { error: 'Email (or commander name) and password are required' },
        { status: 400 }
      )
    }

    // Rate limit on the raw input so username and email attempts share the same bucket
    const identifier = getEmailIdentifier(input.toLowerCase(), request)
    const rateLimitResult = RateLimiters.auth(identifier)

    if (!rateLimitResult.allowed) {
      await recordAuthEvent({
        eventType: 'login_failed',
        request,
        email: input.toLowerCase(),
        method: 'password',
        metadata: { reason: 'rate_limited' },
      })
      return NextResponse.json(
        {
          error: 'Too many login attempts. Please try again later.',
          retryAfter: rateLimitResult.retryAfter,
        },
        {
          status: 429,
          headers: {
            'Retry-After': rateLimitResult.retryAfter?.toString() || '900',
            'X-RateLimit-Limit': '5',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(rateLimitResult.resetAt).toISOString(),
          },
        }
      )
    }

    const supabase = createServerClient()

    // Resolve username → email if needed
    const resolvedEmail = await resolveEmailFromInput(input, supabase)

    if (!resolvedEmail) {
      await recordAuthEvent({
        eventType: 'login_failed',
        request,
        email: input.toLowerCase(),
        method: 'password',
        metadata: { reason: 'unknown_identifier' },
      })
      return NextResponse.json(
        { error: 'Invalid email, commander name, or password' },
        { status: 401 }
      )
    }

    // Authenticate with Supabase
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: resolvedEmail,
      password,
    })

    if (authError || !authData.user) {
      await recordAuthEvent({
        eventType: 'login_failed',
        request,
        email: resolvedEmail.toLowerCase(),
        method: 'password',
        metadata: { reason: 'bad_password' },
      })
      return NextResponse.json(
        { error: 'Invalid email, commander name, or password' },
        { status: 401 }
      )
    }

    // Get user profile to include role
    const { data: profile } = await (supabase.from('profiles') as any)
      .select('role, display_name, login_count')
      .eq('id', authData.user.id)
      .single()

    const role = (profile as any)?.role || 'user'

    // Telemetry: record the successful login (the DB trigger updates
    // last_login_at / login_count on profiles).
    await recordAuthEvent({
      eventType: 'login_success',
      request,
      userId: authData.user.id,
      email: authData.user.email,
      method: 'password',
    })

    // Security automation: alert on sign-in from an IP we haven't seen for an
    // already-established account.
    const { ip, userAgent } = getClientInfo(request)
    const priorLogins = (profile as any)?.login_count ?? 0
    if (ip && priorLogins > 0) {
      const { count: seenBefore } = await (supabase.from('auth_events') as any)
        .select('*', { count: 'exact', head: true })
        .eq('user_id', authData.user.id)
        .eq('event_type', 'login_success')
        .eq('ip_address', ip)
      if (!seenBefore || seenBefore <= 1) {
        await enqueueLifecycleJob({
          userId: authData.user.id,
          jobType: 'new_device_alert',
          dedupeKey: `new_device_alert:${authData.user.id}:${ip}`,
          payload: {
            email: authData.user.email,
            displayName: (profile as any)?.display_name,
            ip,
            userAgent,
            at: new Date().toISOString(),
          },
        })
      }
    }

    const response = NextResponse.json({
      success: true,
      user: {
        id: authData.user.id,
        email: authData.user.email,
        role,
      },
    })

    setSessionOnResponse(response, authData.user.id, authData.user.email!, role)

    return response
  } catch (error: any) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
