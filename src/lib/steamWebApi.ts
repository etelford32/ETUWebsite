/**
 * Steamworks partner Web API calls used by game sign-in (ACCOUNT-01).
 *
 * All calls use the *publisher* Web API key (STEAM_PUBLISHER_KEY), which is
 * different from STEAM_WEB_API_KEY used for public profile lookups. It must
 * only ever live in server env vars — never log it or return it.
 */

const PARTNER_API = 'https://partner.steam-api.com'
const REQUEST_TIMEOUT_MS = 8000

/** The identity string the game passes to GetAuthTicketForWebApi. */
export const STEAM_WEBAPI_TICKET_IDENTITY = 'etu-account'

/** Explore the Universe 2175. Overridable for a playtest/demo App ID. */
export const DEFAULT_STEAM_APP_ID = '4094340'

export interface SteamConfig {
  publisherKey: string
  appId: string
}

export function getSteamConfig(): SteamConfig | null {
  const publisherKey = process.env.STEAM_PUBLISHER_KEY
  if (!publisherKey) return null
  return { publisherKey, appId: process.env.STEAM_APP_ID || DEFAULT_STEAM_APP_ID }
}

export interface SteamTicketIdentity {
  steamId: string
  ownerSteamId: string
  vacBanned: boolean
  publisherBanned: boolean
}

export class SteamApiError extends Error {
  constructor(
    public readonly kind: 'invalid_ticket' | 'unavailable',
    message: string
  ) {
    super(message)
  }
}

async function partnerGet(path: string, params: Record<string, string>): Promise<any> {
  const url = `${PARTNER_API}${path}?${new URLSearchParams(params).toString()}`
  let response: Response
  try {
    response = await fetch(url, {
      method: 'GET',
      cache: 'no-store',
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })
  } catch {
    throw new SteamApiError('unavailable', `Steam request to ${path} failed`)
  }
  // Steam answers 403 for a bad key and 5xx when degraded; neither is the
  // player's fault, so both surface as "unavailable", never "invalid".
  if (!response.ok) {
    throw new SteamApiError('unavailable', `Steam ${path} returned HTTP ${response.status}`)
  }
  try {
    return await response.json()
  } catch {
    throw new SteamApiError('unavailable', `Steam ${path} returned non-JSON`)
  }
}

/**
 * ISteamUserAuth/AuthenticateUserTicket: verify a ticket the game obtained
 * from GetAuthTicketForWebApi(STEAM_WEBAPI_TICKET_IDENTITY).
 */
export async function authenticateUserTicket(
  config: SteamConfig,
  ticketHex: string
): Promise<SteamTicketIdentity> {
  const body = await partnerGet('/ISteamUserAuth/AuthenticateUserTicket/v1/', {
    key: config.publisherKey,
    appid: config.appId,
    ticket: ticketHex,
    identity: STEAM_WEBAPI_TICKET_IDENTITY,
  })

  const params = body?.response?.params
  if (!params || params.result !== 'OK' || !/^\d{17}$/.test(String(params.steamid || ''))) {
    const code = body?.response?.error?.errorcode
    throw new SteamApiError('invalid_ticket', `Steam rejected the ticket${code ? ` (error ${code})` : ''}`)
  }

  return {
    steamId: String(params.steamid),
    ownerSteamId: String(params.ownersteamid || params.steamid),
    vacBanned: Boolean(params.vacbanned),
    publisherBanned: Boolean(params.publisherbanned),
  }
}

export interface SteamOwnership {
  ownsApp: boolean
  permanent: boolean
  ownerSteamId: string
}

/** ISteamUser/CheckAppOwnership/v4. Returns null when Steam can't answer. */
export async function checkAppOwnership(
  config: SteamConfig,
  steamId: string
): Promise<SteamOwnership | null> {
  try {
    const body = await partnerGet('/ISteamUser/CheckAppOwnership/v4/', {
      key: config.publisherKey,
      steamid: steamId,
      appid: config.appId,
    })
    const own = body?.appownership
    if (!own) return null
    return {
      ownsApp: Boolean(own.ownsapp),
      permanent: Boolean(own.permanent),
      ownerSteamId: String(own.ownersteamid || steamId),
    }
  } catch {
    return null
  }
}

export interface SteamPlayerSummary {
  personaName: string | null
  avatarUrl: string | null
}

/** ISteamUser/GetPlayerSummaries/v2, best effort (display data only). */
export async function getPlayerSummary(
  config: SteamConfig,
  steamId: string
): Promise<SteamPlayerSummary> {
  try {
    const body = await partnerGet('/ISteamUser/GetPlayerSummaries/v2/', {
      key: config.publisherKey,
      steamids: steamId,
    })
    const player = body?.response?.players?.[0]
    return {
      personaName: typeof player?.personaname === 'string' ? player.personaname.slice(0, 64) : null,
      avatarUrl: typeof player?.avatarfull === 'string' ? player.avatarfull : null,
    }
  } catch {
    return { personaName: null, avatarUrl: null }
  }
}
