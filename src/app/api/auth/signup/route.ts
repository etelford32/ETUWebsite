import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabaseServer'
import { setSessionOnResponse } from '@/lib/session'
import { RateLimiters, getEmailIdentifier } from '@/lib/ratelimit'
import { validatePassword } from '@/lib/passwordValidation'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, username } = body

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Rate limiting: 3 signup attempts per hour per email+IP combination
    const identifier = getEmailIdentifier(email.toLowerCase(), request)
    const rateLimitResult = RateLimiters.signup(identifier)

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          error: 'Too many signup attempts. Please try again later.',
          retryAfter: rateLimitResult.retryAfter
        },
        {
          status: 429,
          headers: {
            'Retry-After': rateLimitResult.retryAfter?.toString() || '3600',
            'X-RateLimit-Limit': '3',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(rateLimitResult.resetAt).toISOString()
          }
        }
      )
    }

    // Validate password strength
    const passwordValidation = validatePassword(password)
    if (!passwordValidation.valid) {
      return NextResponse.json(
        {
          error: 'Password does not meet security requirements',
          details: passwordValidation.errors
        },
        { status: 400 }
      )
    }

    const supabase = createServerClient()

    // Create user with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email for now (you can change this)
      user_metadata: {
        username: username || email.split('@')[0],
      },
    })

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: authError?.message || 'Failed to create account' },
        { status: 400 }
      )
    }

    // Profile is auto-created by database trigger (handle_new_user)
    // Wait a moment for trigger to complete
    await new Promise(resolve => setTimeout(resolve, 500))

    // Get the created profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', authData.user.id)
      .single()

    const role = (profile as any)?.role || 'user'

    // Create session cookie
    const response = NextResponse.json({
      success: true,
      message: 'Account created successfully',
      user: {
        id: authData.user.id,
        email: authData.user.email,
        role,
      },
    })

    setSessionOnResponse(response, authData.user.id, authData.user.email!, role)

    return response
  } catch (error: any) {
    console.error('Signup error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
