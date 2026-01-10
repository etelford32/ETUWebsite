import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabaseServer'
import { setSessionOnResponse } from '@/lib/session'
import { RateLimiters, getEmailIdentifier } from '@/lib/ratelimit'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Rate limiting: 5 login attempts per 15 minutes per email+IP combination
    const identifier = getEmailIdentifier(email.toLowerCase(), request)
    const rateLimitResult = RateLimiters.auth(identifier)

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          error: 'Too many login attempts. Please try again later.',
          retryAfter: rateLimitResult.retryAfter
        },
        {
          status: 429,
          headers: {
            'Retry-After': rateLimitResult.retryAfter?.toString() || '900',
            'X-RateLimit-Limit': '5',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(rateLimitResult.resetAt).toISOString()
          }
        }
      )
    }

    const supabase = createServerClient()

    // Authenticate with Supabase
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError || !authData.user) {
      // Don't reveal whether email exists or password is wrong
      return NextResponse.json(
        { error: 'Invalid email or password' },
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

    // Create session cookie
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
