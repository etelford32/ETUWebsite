import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/session'
import { safeNextPath } from '@/lib/oauth'
import {
  STEAM_INTENT_COOKIE,
  STEAM_INTENT_COOKIE_OPTIONS,
  buildSteamLoginUrl,
  encodeIntent,
  newNonce,
  type SteamIntent,
} from '@/lib/steamOpenId'

export const dynamic = 'force-dynamic'

/** Where "Link Steam" lands when no destination was given. */
const DEFAULT_LINK_RETURN = '/profile?tab=settings'

/**
 * GET /api/steam/auth - Start Steam sign-in or account linking.
 *
 *   ?redirect=/path   same-site page to return to afterwards
 *   ?link=1           attach Steam to the signed-in account instead of
 *                     signing in as the Steam player (requires a session)
 *
 * The intent and a one-time nonce go in a short-lived HTTP-only cookie; the
 * nonce is also embedded in the signed return_to so /api/steam/callback can
 * tie Steam's answer back to this browser.
 */
export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin
  const params = request.nextUrl.searchParams
  const wantsLink = params.get('link') === '1' || params.get('link') === 'true'
  const redirectParam = params.get('redirect')

  let intent: SteamIntent
  if (wantsLink) {
    const session = await getSessionFromRequest(request)
    if (!session) {
      const back = safeNextPath(redirectParam || DEFAULT_LINK_RETURN)
      return NextResponse.redirect(`${origin}/login?redirect=${encodeURIComponent(back)}`)
    }
    intent = {
      mode: 'link',
      next: safeNextPath(redirectParam || DEFAULT_LINK_RETURN),
      nonce: newNonce(),
      userId: session.userId,
    }
  } else {
    intent = { mode: 'login', next: safeNextPath(redirectParam), nonce: newNonce() }
  }

  const response = NextResponse.redirect(buildSteamLoginUrl(origin, intent.nonce))
  response.cookies.set(STEAM_INTENT_COOKIE, encodeIntent(intent), STEAM_INTENT_COOKIE_OPTIONS)
  return response
}
