import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabaseServer'
import { setSessionOnResponse } from '@/lib/session'

/**
 * GET /api/auth/magic-link/callback - Handle magic link callback
 * This is where users land after clicking the magic link in their email
 *
 * Supabase can send tokens in different ways:
 * 1. token_hash + type in query params
 * 2. token in query params
 * 3. access_token in hash fragment (client-side only)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)

  // Try different param formats that Supabase might use
  const token_hash = searchParams.get('token_hash')
  const token = searchParams.get('token')
  const type = searchParams.get('type')
  const redirect = searchParams.get('redirect') || '/dashboard'
  const error = searchParams.get('error')
  const error_description = searchParams.get('error_description')

  // Get the base URL for redirect
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.VERCEL_URL ||
    'http://localhost:3000'

  // Handle error from Supabase
  if (error) {
    console.error('Supabase auth error:', error, error_description)
    return NextResponse.redirect(
      new URL(`/login?error=magic_link_failed&message=${encodeURIComponent(error_description || error)}`, baseUrl)
    )
  }

  try {
    const supabase = createServerClient()
    let user: any = null

    // Method 1: Verify with token_hash (standard Supabase format)
    if (token_hash && type) {
      const verifyType = type === 'signup' ? 'signup' : 'magiclink'
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        token_hash,
        type: verifyType as any,
      })

      if (!verifyError && data?.user) {
        user = data.user
      } else {
        console.error('Token hash verification failed:', verifyError)
      }
    }

    // Method 2: Verify with token (alternative format)
    if (!user && token && type) {
      // For email-based OTP, we need to use the admin API to get user by token
      // This is a fallback - normally token_hash should work
      const { data: users } = await supabase.auth.admin.listUsers()
      // Token verification happens at Supabase level, we just need to find the user
      // In this case, redirect to a page that can handle the token client-side
      console.log('Token-based auth - may need client-side handling')
    }

    // Method 3: Check if there's already an authenticated session
    // (Supabase might have set cookies directly)
    if (!user) {
      const { data: { user: sessionUser } } = await supabase.auth.getUser()
      if (sessionUser) {
        user = sessionUser
      }
    }

    // If we still don't have a user, redirect with error
    if (!user) {
      console.error('Could not verify magic link - no valid token found')
      return NextResponse.redirect(
        new URL(`/login?error=invalid_magic_link`, baseUrl)
      )
    }

    // Wait for profile to be created (auto-created by database trigger)
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
        .eq('id', user.id)
        .single()

      if (data) {
        profile = data
        break
      }
    }

    const role = (profile as any)?.role || 'user'

    // Create response that redirects to the intended destination
    const response = NextResponse.redirect(new URL(redirect, baseUrl))

    // Set session cookie
    setSessionOnResponse(response, user.id, user.email!, role)

    return response
  } catch (error: any) {
    console.error('Magic link callback error:', error)
    return NextResponse.redirect(
      new URL(`/login?error=magic_link_failed`, baseUrl)
    )
  }
}
