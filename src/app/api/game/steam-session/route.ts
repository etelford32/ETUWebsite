import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabaseServer'
import { checkRateLimit, getIdentifier } from '@/lib/ratelimit'
import { recordAuthEvent } from '@/lib/authEvents'
import {
  SteamApiError,
  authenticateUserTicket,
  checkAppOwnership,
  getPlayerSummary,
  getSteamConfig,
} from '@/lib/steamWebApi'
import { findOrCreateSteamAccount, mintSession } from '@/lib/steamAccount'

/**
 * POST /api/game/steam-session — game sign-in (ACCOUNT-01 phase 1).
 *
 * Body: { "ticket": "<hex from GetAuthTicketForWebApi('etu-account')>" }
 *
 * The game is not a browser: no cookies, no CSRF token. Proof of identity is
 * the Steam ticket, verified server-side with the publisher key. On success
 * the response carries an ordinary Supabase session the game uses for its
 * own RPCs (claim_username, get_my_profile) under RLS.
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const TICKET_PATTERN = /^[0-9A-Fa-f]{16,4096}$/
const NO_STORE = { 'Cache-Control': 'no-store' }

function fail(status: number, error: string, extra: Record<string, unknown> = {}) {
  return NextResponse.json({ ok: false, error, ...extra }, { status, headers: NO_STORE })
}

export async function POST(request: NextRequest) {
  const limit = checkRateLimit(`steam-session:${getIdentifier(request)}`, 10, 60 * 1000)
  if (!limit.allowed) {
    return fail(429, 'rate_limited', { retry_after: limit.retryAfter })
  }

  const config = getSteamConfig()
  if (!config) {
    console.error('steam-session: STEAM_PUBLISHER_KEY is not configured')
    return fail(503, 'not_configured')
  }

  let ticket: unknown
  try {
    ticket = (await request.json())?.ticket
  } catch {
    return fail(400, 'bad_request')
  }
  if (typeof ticket !== 'string' || !TICKET_PATTERN.test(ticket)) {
    return fail(400, 'bad_request')
  }

  let identity
  try {
    identity = await authenticateUserTicket(config, ticket)
  } catch (err) {
    if (err instanceof SteamApiError && err.kind === 'invalid_ticket') {
      return fail(401, 'invalid_ticket')
    }
    console.error('steam-session: Steam unavailable:', (err as Error).message)
    return fail(502, 'steam_unavailable')
  }

  if (identity.publisherBanned) {
    return fail(403, 'banned')
  }

  try {
    const [ownership, summary] = await Promise.all([
      checkAppOwnership(config, identity.steamId),
      getPlayerSummary(config, identity.steamId),
    ])

    const account = await findOrCreateSteamAccount(identity.steamId, summary)
    if (account.status !== 'active') {
      return fail(403, account.status === 'deleted' ? 'account_deleted' : 'account_suspended')
    }

    const session = await mintSession(account.email)

    const supabase = createServerClient()
    const { data: profile } = await (supabase.from('profiles') as any)
      .select('username, display_name, avatar_url')
      .eq('id', account.userId)
      .single()

    const familyShared = identity.ownerSteamId !== identity.steamId

    await recordAuthEvent({
      eventType: account.created ? 'signup' : 'login_success',
      request,
      userId: account.userId,
      method: 'steam',
      metadata: { client: 'game', family_shared: familyShared, owns_app: ownership?.ownsApp ?? null },
    })

    return NextResponse.json(
      {
        ok: true,
        created: account.created,
        user_id: account.userId,
        steam_id: identity.steamId,
        session: {
          access_token: session.accessToken,
          refresh_token: session.refreshToken,
          expires_at: session.expiresAt,
          expires_in: session.expiresIn,
        },
        profile: {
          username: profile?.username ?? null,
          display_name: profile?.display_name ?? null,
          avatar_url: profile?.avatar_url ?? null,
          needs_username: !profile?.username,
        },
        entitlement: {
          // null when Steam's ownership service could not answer.
          owns_app: ownership ? ownership.ownsApp : null,
          permanent: ownership ? ownership.permanent : null,
          family_shared: familyShared,
        },
      },
      { headers: NO_STORE }
    )
  } catch (err) {
    console.error('steam-session: account/session error:', (err as Error).message)
    return fail(500, 'server_error')
  }
}
