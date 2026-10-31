/**
 * LEADERBOARD-00: write scores to Steam leaderboards with the publisher key.
 *
 * Every board is created "trusted writes only", so the game client cannot
 * post to it: this module is the only writer. Board ids are resolved once
 * by name (FindOrCreateLeaderboard) and cached in public.steam_leaderboards.
 */

import { createServerClient } from '@/lib/supabaseServer'
import { SteamConfig } from '@/lib/steamWebApi'
import { getBoard } from '@/lib/leaderboards'

const PARTNER_API = 'https://partner.steam-api.com'
const REQUEST_TIMEOUT_MS = 8000

export class SteamLeaderboardError extends Error {}

/** Percent-encode raw bytes for a rawbinary Web API parameter. */
function encodeBytes(bytes: Uint8Array): string {
  let out = ''
  for (const b of bytes) out += '%' + b.toString(16).padStart(2, '0').toUpperCase()
  return out
}

/** int32[] → little-endian bytes, the layout ISteamUserStats details use. */
export function detailsToBytes(details: number[]): Uint8Array {
  const buffer = new ArrayBuffer(details.length * 4)
  const view = new DataView(buffer)
  details.forEach((value, i) => view.setInt32(i * 4, value | 0, true))
  return new Uint8Array(buffer)
}

async function partnerPost(
  path: string,
  params: Record<string, string>,
  rawBinary: Record<string, Uint8Array> = {}
): Promise<any> {
  let body = new URLSearchParams(params).toString()
  for (const [key, bytes] of Object.entries(rawBinary)) {
    body += `&${encodeURIComponent(key)}=${encodeBytes(bytes)}`
  }
  let response: Response
  try {
    response = await fetch(`${PARTNER_API}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
      cache: 'no-store',
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })
  } catch {
    throw new SteamLeaderboardError(`Steam request to ${path} failed`)
  }
  if (!response.ok) {
    throw new SteamLeaderboardError(`Steam ${path} returned HTTP ${response.status}`)
  }
  try {
    return await response.json()
  } catch {
    throw new SteamLeaderboardError(`Steam ${path} returned non-JSON`)
  }
}

/** Steam reports success as result === 1 (k_EResultOK). */
function resultOk(body: any): boolean {
  return Number(body?.result?.result) === 1
}

const idCache = new Map<string, number>()

/**
 * The Steam leaderboard id for a board, creating the board on first use
 * with this website as its only writer.
 */
export async function resolveLeaderboardId(config: SteamConfig, name: string): Promise<number> {
  const cached = idCache.get(name)
  if (cached) return cached

  const supabase = createServerClient()
  const { data } = await (supabase.from('steam_leaderboards') as any)
    .select('leaderboard_id')
    .eq('name', name)
    .maybeSingle()
  if (data?.leaderboard_id) {
    idCache.set(name, Number(data.leaderboard_id))
    return Number(data.leaderboard_id)
  }

  const board = getBoard(name)
  if (!board) throw new SteamLeaderboardError(`unknown board ${name}`)

  const body = await partnerPost('/ISteamLeaderboards/FindOrCreateLeaderboard/v2/', {
    key: config.publisherKey,
    appid: config.appId,
    name,
    sortmethod: 'Descending',
    displaytype: board.steamDisplayType,
    createifnotfound: 'true',
    onlytrustedwrites: 'true',
    onlyfriendsreads: 'false',
  })
  const leaderboard = body?.result?.leaderboard ?? {}
  const id = Number(leaderboard.leaderBoardID ?? leaderboard.leaderboardid ?? leaderboard.id)
  if (!resultOk(body) || !Number.isFinite(id) || id <= 0) {
    throw new SteamLeaderboardError(`FindOrCreateLeaderboard(${name}) failed`)
  }

  await (supabase.from('steam_leaderboards') as any)
    .upsert({ name, leaderboard_id: id }, { onConflict: 'name' })
  idCache.set(name, id)
  return id
}

/** Post a score; KeepBest, so a worse run never lowers the entry. */
export async function setLeaderboardScore(
  config: SteamConfig,
  board: string,
  steamId: string,
  score: number,
  details: number[]
): Promise<void> {
  const leaderboardId = await resolveLeaderboardId(config, board)
  const params = {
    key: config.publisherKey,
    appid: config.appId,
    leaderboardid: String(leaderboardId),
    steamid: steamId,
    score: String(Math.trunc(score)),
    scoremethod: 'KeepBest',
  }
  const body = await partnerPost('/ISteamLeaderboards/SetLeaderboardScore/v1/', params, {
    details: detailsToBytes(details),
  })
  if (!resultOk(body)) {
    throw new SteamLeaderboardError(`SetLeaderboardScore(${board}) failed`)
  }
}

/** Remove a player's entry, e.g. when staff delete a run. */
export async function deleteLeaderboardScore(
  config: SteamConfig,
  board: string,
  steamId: string
): Promise<void> {
  const leaderboardId = await resolveLeaderboardId(config, board)
  const body = await partnerPost('/ISteamLeaderboards/DeleteLeaderboardScore/v1/', {
    key: config.publisherKey,
    appid: config.appId,
    leaderboardid: String(leaderboardId),
    steamid: steamId,
  })
  if (!resultOk(body)) {
    throw new SteamLeaderboardError(`DeleteLeaderboardScore(${board}) failed`)
  }
}
