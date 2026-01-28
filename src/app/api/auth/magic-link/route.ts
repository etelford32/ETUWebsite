import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabaseServer'
import { RateLimiters, getEmailIdentifier } from '@/lib/ratelimit'

/**
 * POST /api/auth/magic-link - Send a magic link email for passwordless login
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, redirectTo } = body

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Rate limiting: 3 magic link attempts per hour per email+IP combination
    const identifier = getEmailIdentifier(email.toLowerCase(), request)
    const rateLimitResult = RateLimiters.signup(identifier) // Reuse signup rate limiter

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          error: 'Too many magic link requests. Please try again later.',
          retryAfter: rateLimitResult.retryAfter
        },
        {
          status: 429,
          headers: {
            'Retry-After': rateLimitResult.retryAfter?.toString() || '3600',
          }
        }
      )
    }

    const supabase = createServerClient()

    // Get the base URL for the redirect
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.VERCEL_URL ||
      'http://localhost:3000'

    // Build the redirect URL - where the user will land after clicking the magic link
    const finalRedirect = redirectTo || '/dashboard'
    const redirectURL = `${baseUrl}/api/auth/magic-link/callback?redirect=${encodeURIComponent(finalRedirect)}`

    // Send magic link via Supabase Auth
    const { error: authError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: redirectURL,
        shouldCreateUser: true, // Allow new users to sign up via magic link
      }
    })

    if (authError) {
      console.error('Magic link error:', authError)
      return NextResponse.json(
        { error: authError.message || 'Failed to send magic link' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Magic link sent! Check your email inbox.'
    })
  } catch (error: any) {
    console.error('Magic link error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
