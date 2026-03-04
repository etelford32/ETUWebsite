import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabaseServer'
import { setSessionOnResponse } from '@/lib/session'
import { RateLimiters, getEmailIdentifier } from '@/lib/ratelimit'
import { resolveEmailFromInput } from '@/lib/resolveEmail'

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
      return NextResponse.json(
        { error: 'Invalid email, commander name, or password' },
        { status: 401 }
      )
    }

    // Get user profile to include role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', authData.user.id)
      .single()

    const role = (profile as any)?.role || 'user'

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
