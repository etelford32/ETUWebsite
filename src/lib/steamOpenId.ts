/**
 * Steam OpenID 2.0 for the website (sign-in and account linking).
 *
 * Steam is the OpenID provider; it does not need an API key to authenticate
 * a player, only to look up their public persona/avatar afterwards. The flow
 * is two redirects:
 *
 *   /api/steam/auth      stash intent (sign-in or link) + a nonce in a cookie,
 *                        send the browser to steamcommunity.com
 *   /api/steam/callback  verify Steam's signed response, check the nonce,
 *                        then sign the player in or attach the Steam ID
 *
 * The nonce travels in openid.return_to, which Steam signs, so a callback is
 * only honoured by the browser that started it (no login/link CSRF).
 */

import { randomBytes } from 'crypto'
import { isValidSteamId } from './steamIdentity'

export const STEAM_OPENID_ENDPOINT = 'https://steamcommunity.com/openid/login'
const STEAM_CLAIMED_ID_PREFIX = 'https://steamcommunity.com/openid/id/'

export const STEAM_CALLBACK_PATH = '/api/steam/callback'
export const STEAM_INTENT_COOKIE = 'etu_steam_intent'
export const STEAM_INTENT_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const, // must survive the top-level redirect back from Steam
  maxAge: 60 * 10,
  path: '/api/steam',
}

export type SteamIntentMode = 'login' | 'link'

export interface SteamIntent {
  mode: SteamIntentMode
  /** Same-site path to land on afterwards. */
  next: string
  /** Random per-attempt value, echoed back in openid.return_to. */
  nonce: string
  /** Link mode only: the signed-in user who started the flow. */
  userId?: string
}

export function newNonce(): string {
  return randomBytes(16).toString('hex')
}

export function encodeIntent(intent: SteamIntent): string {
  return Buffer.from(JSON.stringify(intent), 'utf8').toString('base64url')
}

export function decodeIntent(value: string | undefined | null): SteamIntent | null {
  if (!value) return null
  try {
    const parsed = JSON.parse(Buffer.from(value, 'base64url').toString('utf8'))
    if (
      !parsed ||
      (parsed.mode !== 'login' && parsed.mode !== 'link') ||
      typeof parsed.next !== 'string' ||
      typeof parsed.nonce !== 'string' ||
      !/^[0-9a-f]{32}$/.test(parsed.nonce) ||
      (parsed.userId !== undefined && typeof parsed.userId !== 'string')
    ) {
      return null
    }
    return parsed as SteamIntent
  } catch {
    return null
  }
}

export function buildReturnTo(origin: string, nonce: string): string {
  return `${origin}${STEAM_CALLBACK_PATH}?nonce=${nonce}`
}

/** The URL to send the browser to so Steam can authenticate the player. */
export function buildSteamLoginUrl(origin: string, nonce: string): string {
  const params = new URLSearchParams({
    'openid.ns': 'http://specs.openid.net/auth/2.0',
    'openid.mode': 'checkid_setup',
    'openid.return_to': buildReturnTo(origin, nonce),
    'openid.realm': origin,
    'openid.identity': 'http://specs.openid.net/auth/2.0/identifier_select',
    'openid.claimed_id': 'http://specs.openid.net/auth/2.0/identifier_select',
  })
  return `${STEAM_OPENID_ENDPOINT}?${params.toString()}`
}

export type SteamOpenIdFailure =
  | 'cancelled'
  | 'invalid_response'
  | 'nonce_mismatch'
  | 'signature_invalid'
  | 'unavailable'

export type SteamOpenIdResult =
  | { ok: true; steamId: string }
  | { ok: false; reason: SteamOpenIdFailure }

/**
 * Validate the positive assertion Steam redirected back with, per OpenID 2.0
 * §11: mode, return_to, claimed_id, and the signature (via
 * check_authentication, which also makes response_nonce single-use).
 */
export async function verifySteamResponse(
  params: URLSearchParams,
  expected: { origin: string; nonce: string }
): Promise<SteamOpenIdResult> {
  const mode = params.get('openid.mode')
  if (mode === 'cancel') return { ok: false, reason: 'cancelled' }
  if (mode !== 'id_res') return { ok: false, reason: 'invalid_response' }

  // §11.1: return_to must be the URL of this request.
  const returnTo = params.get('openid.return_to')
  if (!returnTo || returnTo !== buildReturnTo(expected.origin, expected.nonce)) {
    return { ok: false, reason: 'nonce_mismatch' }
  }
  if (params.get('nonce') !== expected.nonce) {
    return { ok: false, reason: 'nonce_mismatch' }
  }

  const claimedId = params.get('openid.claimed_id')
  const identity = params.get('openid.identity')
  if (!claimedId || !identity || claimedId !== identity) {
    return { ok: false, reason: 'invalid_response' }
  }
  if (!claimedId.startsWith(STEAM_CLAIMED_ID_PREFIX)) {
    return { ok: false, reason: 'invalid_response' }
  }
  const steamId = claimedId.slice(STEAM_CLAIMED_ID_PREFIX.length)
  if (!isValidSteamId(steamId)) return { ok: false, reason: 'invalid_response' }

  // The signature must cover the fields we rely on.
  const signed = (params.get('openid.signed') || '').split(',')
  for (const field of ['claimed_id', 'identity', 'return_to', 'response_nonce']) {
    if (!signed.includes(field)) return { ok: false, reason: 'invalid_response' }
  }

  // §11.4.2: ask Steam directly whether this exact assertion is genuine.
  const verifyParams = new URLSearchParams()
  params.forEach((value, key) => {
    if (key.startsWith('openid.')) verifyParams.append(key, value)
  })
  verifyParams.set('openid.mode', 'check_authentication')

  let text: string
  try {
    const response = await fetch(STEAM_OPENID_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: verifyParams.toString(),
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    })
    if (!response.ok) return { ok: false, reason: 'unavailable' }
    text = await response.text()
  } catch (error) {
    console.error('Steam OpenID check_authentication failed:', error)
    return { ok: false, reason: 'unavailable' }
  }

  // Key-value form response: "ns:...\nis_valid:true\n"
  const isValid = text.split('\n').some((line) => line.trim() === 'is_valid:true')
  if (!isValid) return { ok: false, reason: 'signature_invalid' }

  return { ok: true, steamId }
}

export interface SteamPublicSummary {
  personaName: string | null
  avatarUrl: string | null
}

/**
 * Public persona + avatar via the regular Web API key. Display data only
 * and best effort: a missing key or a Steam hiccup just yields nulls.
 */
export async function fetchPublicSummary(steamId: string): Promise<SteamPublicSummary> {
  const key = process.env.STEAM_WEB_API_KEY
  if (!key) return { personaName: null, avatarUrl: null }
  try {
    const url =
      'https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?' +
      new URLSearchParams({ key, steamids: steamId }).toString()
    const response = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(8000) })
    if (!response.ok) return { personaName: null, avatarUrl: null }
    const body = await response.json()
    const player = body?.response?.players?.[0]
    return {
      personaName: typeof player?.personaname === 'string' ? player.personaname.slice(0, 64) : null,
      avatarUrl: typeof player?.avatarfull === 'string' ? player.avatarfull : null,
    }
  } catch {
    return { personaName: null, avatarUrl: null }
  }
}
