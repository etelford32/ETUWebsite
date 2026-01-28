import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabaseServer'
import { setSessionOnResponse } from '@/lib/session'
import { RateLimiters, getEmailIdentifier } from '@/lib/ratelimit'
import { validatePassword } from '@/lib/passwordValidation'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, username, isAlphaApplicant } = body

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
    // Poll for profile creation with retry logic to handle race condition
    let profile = null
    let attempts = 0
    const maxAttempts = 10
    const delayMs = 200

    while (!profile && attempts < maxAttempts) {
      attempts++
      await new Promise(resolve => setTimeout(resolve, delayMs))

      const { data } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', authData.user.id)
        .single()

      if (data) {
        profile = data
        break
      }
    }

    if (!profile) {
      console.warn(`Profile not created after ${maxAttempts} attempts for user ${authData.user.id}`)
    }

    const role = (profile as any)?.role || 'user'

    // If signing up from alpha testing flow, mark as alpha tester
    if (isAlphaApplicant && profile) {
      const { error: alphaError } = await supabase
        .from('profiles')
        .update({ is_alpha_tester: true })
        .eq('id', authData.user.id)

      if (alphaError) {
        // Log but don't fail - the is_alpha_tester column may not exist yet
        console.warn('Failed to set is_alpha_tester:', alphaError.message)
      }
    }

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
