import { NextRequest } from 'next/server'
import { createServerClient } from './supabaseServer'
import { SteamApiError, authenticateUserTicket, getSteamConfig } from './steamWebApi'
import { isValidSteamId } from './steamIdentity'

/**
 * Who is calling a /api/game/* endpoint.
 *
 * The game is not a browser: no cookies, no CSRF. It proves identity with
 * either or both of
 *   - `Authorization: Bearer <access_token>` — the Supabase session minted
 *     by /api/game/steam-session (identifies the account), and/or
 *   - `ticket` in the JSON body — a fresh Steam ticket from
 *     GetAuthTicketForWebApi('etu-account') (proves a live Steam client is
 *     behind the request, and which Steam ID it is).
 *
 * A request is "Steam-verified" only when the ticket checks out with Steam
 * and names the Steam ID linked to the account. Score submissions use that
 * flag to decide whether a score is trusted enough for the public board.
 */

export const TICKET_PATTERN = /^[0-9A-Fa-f]{16,4096}$/

export interface GameCallerProfile {
  id: string
  username: string | null
  status: string
  steam_id: string | null
  is_verified_owner: boolean
  highest_score: number
}

export interface GameCaller {
  userId: string
  steamId: string | null
  /** The request carried a Steam ticket that Steam accepted for this account. */
  steamVerified: boolean
  /** Why steamVerified is false (null when true). For audit metadata. */
  unverifiedReason: string | null
  profile: GameCallerProfile
}

export type GameAuthResult =
  | { ok: true; caller: GameCaller }
  | { ok: false; status: number; error: string }

function bearerToken(request: NextRequest): string | null {
  const header = request.headers.get('authorization') || ''
  const match = /^Bearer\s+(.+)$/i.exec(header.trim())
  return match ? match[1].trim() : null
}

export async function resolveGameCaller(request: NextRequest, body: any): Promise<GameAuthResult> {
  const token = bearerToken(request)
  const ticket = typeof body?.ticket === 'string' ? body.ticket : null

  if (!token && !ticket) {
    return { ok: false, status: 401, error: 'unauthorized' }
  }
  if (ticket && !TICKET_PATTERN.test(ticket)) {
    return { ok: false, status: 400, error: 'bad_ticket' }
  }

  const supabase = createServerClient()

  // 1. Account from the bearer token, when present.
  let bearerUserId: string | null = null
  if (token) {
    const { data, error } = await supabase.auth.getUser(token)
    if (error || !data?.user) {
      return { ok: false, status: 401, error: 'unauthorized' }
    }
    bearerUserId = data.user.id
  }

  // 2. Steam identity from the ticket, when present.
  let ticketSteamId: string | null = null
  let unverifiedReason: string | null = ticket ? null : 'no steam ticket'
  if (ticket) {
    const config = getSteamConfig()
    if (!config) {
      if (!bearerUserId) return { ok: false, status: 503, error: 'not_configured' }
      unverifiedReason = 'steam not configured on server'
    } else {
      try {
        const identity = await authenticateUserTicket(config, ticket)
        if (identity.publisherBanned) return { ok: false, status: 403, error: 'banned' }
        ticketSteamId = identity.steamId
      } catch (err) {
        if (err instanceof SteamApiError && err.kind === 'invalid_ticket') {
          if (!bearerUserId) return { ok: false, status: 401, error: 'invalid_ticket' }
          unverifiedReason = 'steam rejected the ticket'
        } else {
          if (!bearerUserId) return { ok: false, status: 502, error: 'steam_unavailable' }
          unverifiedReason = 'steam unavailable'
        }
      }
    }
  }

  // 3. Resolve the profile: by account id, else by the ticket's Steam ID.
  const columns = 'id, username, status, steam_id, is_verified_owner, highest_score'
  let profile: any = null
  if (bearerUserId) {
    const { data } = await (supabase.from('profiles') as any).select(columns).eq('id', bearerUserId).maybeSingle()
    profile = data
  } else if (ticketSteamId) {
    const { data } = await (supabase.from('profiles') as any).select(columns).eq('steam_id', ticketSteamId).maybeSingle()
    profile = data
    if (!profile) return { ok: false, status: 404, error: 'no_account' }
  }
  if (!profile) return { ok: false, status: 401, error: 'unauthorized' }
  if (profile.status && profile.status !== 'active') {
    return { ok: false, status: 403, error: profile.status === 'deleted' ? 'account_deleted' : 'account_suspended' }
  }

  // 4. A ticket for a different Steam account than the one linked is a
  //    hard failure: someone is mixing credentials.
  let steamVerified = false
  if (ticketSteamId) {
    if (profile.steam_id && profile.steam_id !== ticketSteamId) {
      return { ok: false, status: 403, error: 'account_mismatch' }
    }
    if (!profile.steam_id) {
      unverifiedReason = 'account has no linked steam id'
    } else {
      steamVerified = true
      unverifiedReason = null
    }
  }

  return {
    ok: true,
    caller: {
      userId: profile.id,
      steamId: isValidSteamId(profile.steam_id) ? profile.steam_id : null,
      steamVerified,
      unverifiedReason,
      profile: {
        id: profile.id,
        username: profile.username ?? null,
        status: profile.status ?? 'active',
        steam_id: profile.steam_id ?? null,
        is_verified_owner: profile.is_verified_owner === true,
        highest_score: Number(profile.highest_score ?? 0),
      },
    },
  }
}
