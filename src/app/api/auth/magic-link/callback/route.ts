import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabaseServer'
import { setSessionOnResponse } from '@/lib/session'

/**
 * GET /api/auth/magic-link/callback - Handle magic link callback
 * This is where users land after clicking the magic link in their email
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type')
  const redirect = searchParams.get('redirect') || '/dashboard'

  // Get the base URL for redirect
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.VERCEL_URL ||
    'http://localhost:3000'

  // Handle error cases
  if (!token_hash || type !== 'magiclink') {
    // Redirect to login with error
    return NextResponse.redirect(
      new URL(`/login?error=invalid_magic_link`, baseUrl)
    )
  }

  try {
    const supabase = createServerClient()

    // Verify the magic link token
    const { data: { user }, error: verifyError } = await supabase.auth.verifyOtp({
      token_hash,
      type: 'magiclink',
    })

    if (verifyError || !user) {
      console.error('Magic link verification error:', verifyError)
      return NextResponse.redirect(
        new URL(`/login?error=magic_link_expired`, baseUrl)
      )
    }

    // Check/create profile (profile is auto-created by trigger, but wait for it)
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
