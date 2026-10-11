import { NextRequest, NextResponse } from 'next/server'
import { createOAuthClient, createServerClient, OAUTH_VERIFIER_KEY } from '@/lib/supabaseServer'
import { setSessionOnResponse } from '@/lib/session'
import { recordAuthEvent } from '@/lib/authEvents'
import { enqueueLifecycleJob } from '@/lib/lifecycle'
import {
  OAUTH_COOKIE_OPTIONS,
  OAUTH_NEXT_COOKIE,
  OAUTH_VERIFIER_COOKIE,
  safeNextPath,
} from '@/lib/oauth'

/**
 * GET /api/auth/callback - Finish Google sign-in (OAuth PKCE).
 *
 * Supabase redirects here with ?code=... after Google approves. The code
 * verifier saved by /api/auth/google completes the exchange; we then issue
 * our own etu_session cookie, like every other sign-in method.
 */
export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin
  const code = request.nextUrl.searchParams.get('code')
  const providerError = request.nextUrl.searchParams.get('error_description') ||
    request.nextUrl.searchParams.get('error')
  const verifier = request.cookies.get(OAUTH_VERIFIER_COOKIE)?.value
  const next = safeNextPath(request.cookies.get(OAUTH_NEXT_COOKIE)?.value)

  const finish = (response: NextResponse) => {
    response.cookies.set(OAUTH_VERIFIER_COOKIE, '', { ...OAUTH_COOKIE_OPTIONS, maxAge: 0 })
    response.cookies.set(OAUTH_NEXT_COOKIE, '', { ...OAUTH_COOKIE_OPTIONS, maxAge: 0 })
    return response
  }
  const fail = (reason: string) =>
    finish(NextResponse.redirect(`${origin}/login?error=${reason}`))

  if (providerError) {
    // e.g. the user hit "Cancel" on Google's consent screen
    console.error('OAuth provider error:', providerError)
    return fail('oauth_cancelled')
  }

  if (!code) return fail('oauth_failed')
  if (!verifier) return fail('oauth_expired')

  try {
    const oauth = createOAuthClient({ [OAUTH_VERIFIER_KEY]: verifier })
    const { data: { user }, error } = await oauth.auth.exchangeCodeForSession(code)

    if (error || !user?.email) {
      console.error('OAuth callback error:', error)
      return fail('oauth_failed')
    }

    const supabase = createServerClient()

    // New users get a profile from the handle_new_user trigger, which runs in
    // the same transaction as the auth.users insert, so it exists by now.
    const { data: profile } = await (supabase.from('profiles') as any)
      .select('role, login_count')
      .eq('id', user.id)
      .maybeSingle()

    const role = (profile as any)?.role || 'user'
    const isNewUser = !(profile as any)?.login_count

    if (isNewUser) {
      await recordAuthEvent({
        eventType: 'signup',
        request,
        userId: user.id,
        email: user.email,
        method: 'oauth',
        metadata: { provider: 'google' },
      })
      await recordAuthEvent({
        eventType: 'email_verified',
        request,
        userId: user.id,
        email: user.email,
      })
      await enqueueLifecycleJob({
        userId: user.id,
        jobType: 'welcome_email',
        dedupeKey: `welcome_email:${user.id}`,
        payload: {
          email: user.email,
          displayName: user.user_metadata?.full_name || user.user_metadata?.name,
        },
      })
    }
    await recordAuthEvent({
      eventType: 'login_success',
      request,
      userId: user.id,
      email: user.email,
      method: 'oauth',
      metadata: { provider: 'google' },
    })

    const response = finish(NextResponse.redirect(`${origin}${next}`))
    await setSessionOnResponse(response, user.id, user.email, role)
    return response
  } catch (error) {
    console.error('OAuth callback exception:', error)
    return fail('server_error')
  }
}
