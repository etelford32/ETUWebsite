import { NextRequest, NextResponse } from 'next/server'
import { createOAuthClient, OAUTH_VERIFIER_KEY } from '@/lib/supabaseServer'
import {
  OAUTH_COOKIE_OPTIONS,
  OAUTH_NEXT_COOKIE,
  OAUTH_VERIFIER_COOKIE,
  safeNextPath,
} from '@/lib/oauth'

/**
 * GET /api/auth/google - Start Google sign-in.
 *
 * Asks Supabase for the Google authorize URL (PKCE), stashes the code
 * verifier and the post-login destination in short-lived HTTP-only cookies,
 * and redirects the browser to Google. Supabase sends the user back to
 * /api/auth/callback, which finishes the exchange.
 */
export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin
  const next = safeNextPath(request.nextUrl.searchParams.get('redirect'))

  try {
    const store: Record<string, string> = {}
    const supabase = createOAuthClient(store)

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${origin}/api/auth/callback`,
        skipBrowserRedirect: true,
        queryParams: { prompt: 'select_account' },
      },
    })

    const verifier = store[OAUTH_VERIFIER_KEY]
    if (error || !data?.url || !verifier) {
      console.error('Google OAuth start error:', error)
      return NextResponse.redirect(`${origin}/login?error=oauth_failed`)
    }

    const response = NextResponse.redirect(data.url)
    response.cookies.set(OAUTH_VERIFIER_COOKIE, verifier, OAUTH_COOKIE_OPTIONS)
    response.cookies.set(OAUTH_NEXT_COOKIE, next, OAUTH_COOKIE_OPTIONS)
    return response
  } catch (error) {
    console.error('Google OAuth start exception:', error)
    return NextResponse.redirect(`${origin}/login?error=oauth_failed`)
  }
}
