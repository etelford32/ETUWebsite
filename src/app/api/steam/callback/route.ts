import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabaseServer'
import { getSessionFromRequest, setSessionOnResponse } from '@/lib/session'
import { recordAuthEvent } from '@/lib/authEvents'
import { checkRateLimit, getIdentifier } from '@/lib/ratelimit'
import { findOrCreateSteamAccount } from '@/lib/steamAccount'
import {
  STEAM_INTENT_COOKIE,
  STEAM_INTENT_COOKIE_OPTIONS,
  decodeIntent,
  fetchPublicSummary,
  verifySteamResponse,
  type SteamIntent,
  type SteamPublicSummary,
} from '@/lib/steamOpenId'

export const dynamic = 'force-dynamic'

/**
 * GET /api/steam/callback - Finish Steam sign-in or account linking.
 *
 * Steam redirects here with a signed OpenID assertion. After verifying it
 * (signature, return_to, nonce from the intent cookie) we either:
 *   - sign-in: find or create the Supabase user for this Steam ID and issue
 *     the usual etu_session cookie, like every other sign-in method; or
 *   - link:    attach the Steam ID to the account that started the flow.
 *
 * Every exit clears the intent cookie and lands on a page that can show the
 * outcome (?message=... / ?error=...).
 */

const LINK_FALLBACK = '/profile?tab=settings'

/** Append a query parameter to a same-site path that may already have some. */
function withParam(path: string, key: string, value: string): string {
  const url = new URL(path, 'http://local')
  url.searchParams.set(key, value)
  return `${url.pathname}${url.search}`
}

/** Steam's own avatar hosts; a stored avatar from there is safe to refresh. */
function isSteamAvatar(url: string | null | undefined): boolean {
  return !!url && /^https:\/\/[a-z0-9.-]*steamstatic\.com\//i.test(url)
}

export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin
  const params = request.nextUrl.searchParams
  const intent = decodeIntent(request.cookies.get(STEAM_INTENT_COOKIE)?.value)

  const finish = (response: NextResponse) => {
    response.cookies.set(STEAM_INTENT_COOKIE, '', { ...STEAM_INTENT_COOKIE_OPTIONS, maxAge: 0 })
    return response
  }
  const redirectTo = (path: string) => finish(NextResponse.redirect(`${origin}${path}`))
  const fail = (code: string) => {
    if (intent?.mode === 'link') return redirectTo(withParam(intent.next, 'error', code))
    let path = withParam('/login', 'error', code)
    if (intent && intent.next !== '/dashboard') path = withParam(path, 'redirect', intent.next)
    return redirectTo(path)
  }

  const limit = checkRateLimit(`steam-callback:${getIdentifier(request)}`, 20, 60 * 1000)
  if (!limit.allowed) return fail('steam_rate_limited')

  if (!intent) return fail('steam_expired')

  const verified = await verifySteamResponse(params, { origin, nonce: intent.nonce })
  if (!verified.ok) {
    if (verified.reason !== 'cancelled') {
      console.error('Steam OpenID rejected:', verified.reason)
    }
    switch (verified.reason) {
      case 'cancelled':
        return fail('steam_cancelled')
      case 'unavailable':
        return fail('steam_unavailable')
      default:
        return fail('steam_failed')
    }
  }

  const steamId = verified.steamId
  const summary = await fetchPublicSummary(steamId)

  try {
    return intent.mode === 'link'
      ? await linkSteam(request, intent, steamId, summary, redirectTo, fail)
      : await signInWithSteam(request, intent, steamId, summary, redirectTo, fail)
  } catch (error) {
    console.error('Steam callback exception:', error)
    return fail('steam_server_error')
  }
}

type Redirect = (path: string) => NextResponse
type Fail = (code: string) => NextResponse

async function linkSteam(
  request: NextRequest,
  intent: SteamIntent,
  steamId: string,
  summary: SteamPublicSummary,
  redirectTo: Redirect,
  fail: Fail
): Promise<NextResponse> {
  // The browser must still be signed in as the user who clicked "Link Steam".
  const session = await getSessionFromRequest(request)
  if (!session || session.userId !== intent.userId) {
    return redirectTo(
      `/login?error=steam_session_expired&redirect=${encodeURIComponent(intent.next || LINK_FALLBACK)}`
    )
  }

  const supabase = createServerClient()

  const { data: holder } = await (supabase.from('profiles') as any)
    .select('id')
    .eq('steam_id', steamId)
    .maybeSingle()
  if (holder && holder.id !== session.userId) return fail('steam_already_linked')

  const { data: me, error: meError } = await (supabase.from('profiles') as any)
    .select('steam_id, avatar_url')
    .eq('id', session.userId)
    .maybeSingle()
  if (meError || !me) return fail('steam_server_error')

  if (me.steam_id && me.steam_id !== steamId) return fail('steam_replace_requires_unlink')

  if (me.steam_id !== steamId) {
    const updates: Record<string, unknown> = { steam_id: steamId }
    if (summary.avatarUrl && (!me.avatar_url || isSteamAvatar(me.avatar_url))) {
      updates.avatar_url = summary.avatarUrl
    }
    const { error: updateError } = await (supabase.from('profiles') as any)
      .update(updates)
      .eq('id', session.userId)
    if (updateError) {
      // 23505: lost a race with another account linking the same Steam ID.
      if ((updateError as any).code === '23505') return fail('steam_already_linked')
      console.error('Steam link update failed:', updateError)
      return fail('steam_server_error')
    }

    // Mirror into app_metadata so the game's steam-session lookup and the
    // profiles row agree on who owns this Steam ID.
    const { error: metaError } = await supabase.auth.admin.updateUserById(session.userId, {
      app_metadata: { steam_id: steamId },
    })
    if (metaError) console.error('Steam link app_metadata update failed:', metaError)
  }

  return redirectTo(withParam(intent.next || LINK_FALLBACK, 'message', 'steam_linked'))
}

async function signInWithSteam(
  request: NextRequest,
  intent: SteamIntent,
  steamId: string,
  summary: SteamPublicSummary,
  redirectTo: Redirect,
  fail: Fail
): Promise<NextResponse> {
  const account = await findOrCreateSteamAccount(steamId, summary, 'steam_web')
  if (account.status !== 'active') {
    return fail(account.status === 'deleted' ? 'steam_account_deleted' : 'steam_account_suspended')
  }

  const supabase = createServerClient()
  const { data: profile } = await (supabase.from('profiles') as any)
    .select('role, username, avatar_url')
    .eq('id', account.userId)
    .maybeSingle()

  // Keep a Steam-sourced avatar fresh; never replace one the player uploaded.
  if (summary.avatarUrl && (!profile?.avatar_url || isSteamAvatar(profile.avatar_url)) &&
      profile?.avatar_url !== summary.avatarUrl) {
    const { error } = await (supabase.from('profiles') as any)
      .update({ avatar_url: summary.avatarUrl })
      .eq('id', account.userId)
    if (error) console.error('Steam avatar refresh failed:', error)
  }

  const role = profile?.role || 'user'

  if (account.created) {
    await recordAuthEvent({
      eventType: 'signup',
      request,
      userId: account.userId,
      method: 'steam',
      metadata: { client: 'web' },
    })
  }
  await recordAuthEvent({
    eventType: 'login_success',
    request,
    userId: account.userId,
    method: 'steam',
    metadata: { client: 'web' },
  })

  // A brand-new Steam player has no callsign yet: take them to the profile
  // page to claim one. Everyone else goes where they were headed.
  const destination = account.created || !profile?.username
    ? withParam('/profile', 'message', 'steam_welcome')
    : intent.next

  const response = redirectTo(destination)
  await setSessionOnResponse(response, account.userId, account.email, role)
  return response
}
