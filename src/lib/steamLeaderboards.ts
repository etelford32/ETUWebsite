/**
 * Steam leaderboards, server side (ISteamLeaderboards partner API).
 *
 * The website is the source of truth for scores (player_scores). After a
 * verified game submission it mirrors the score to the matching Steam
 * leaderboard, so Steam's overlay/friends views and the website agree.
 *
 * Boards are created with "trusted writes only": the game client cannot
 * upload directly through Steamworks, so a modified client can't bypass the
 * website's checks. Set STEAM_LEADERBOARD_TRUSTED_WRITES=false before the
 * boards are first created if the game must keep uploading client-side.
 *
 * All calls need STEAM_PUBLISHER_KEY (getSteamConfig()).
 */

import { SteamApiError, partnerRequest, type SteamConfig } from './steamWebApi'

/** Modes that have a Steam board. 'megabot' is web-only; 'global' is a rollup. */
export const STEAM_LEADERBOARD_MODES = ['speedrun', 'survival', 'discovery', 'boss_rush'] as const
export type SteamLeaderboardMode = (typeof STEAM_LEADERBOARD_MODES)[number]

export function isSteamLeaderboardMode(mode: string): mode is SteamLeaderboardMode {
  return (STEAM_LEADERBOARD_MODES as readonly string[]).includes(mode)
}

/** Steam leaderboard name for a mode. Changing these creates new boards. */
export function steamLeaderboardName(mode: SteamLeaderboardMode): string {
  return `etu_${mode}`
}

/** Steam scores are int32. */
export const STEAM_SCORE_MAX = 2_147_483_647

export interface SteamLeaderboard {
  id: number
  name: string
  entryCount: number
  sortMethod: string
  displayType: string
  onlyTrustedWrites: boolean
}

export interface SteamLeaderboardEntry {
  steamId: string
  score: number
  rank: number
}

export interface SteamScoreUpload {
  leaderboardId: number
  scoreChanged: boolean
  rankPrevious: number | null
  rankNew: number | null
}

function trustedWrites(): boolean {
  return process.env.STEAM_LEADERBOARD_TRUSTED_WRITES !== 'false'
}

function toInt(value: unknown): number | null {
  const n = typeof value === 'string' ? Number(value) : value
  return typeof n === 'number' && Number.isFinite(n) ? n : null
}

function parseLeaderboard(raw: any): SteamLeaderboard | null {
  const id = toInt(raw?.leaderBoardID ?? raw?.id)
  if (id == null) return null
  return {
    id,
    name: String(raw.leaderboardName ?? raw.name ?? ''),
    entryCount: toInt(raw.leaderBoardEntries ?? raw.entries) ?? 0,
    sortMethod: String(raw.leaderBoardSortMethod ?? raw.sortmethod ?? ''),
    displayType: String(raw.leaderBoardDisplayType ?? raw.displaytype ?? ''),
    onlyTrustedWrites: Boolean(raw.onlytrustedwrites),
  }
}

/** ISteamLeaderboards/GetLeaderboardsForGame/v2 */
export async function getLeaderboardsForGame(config: SteamConfig): Promise<SteamLeaderboard[]> {
  const body = await partnerRequest('GET', '/ISteamLeaderboards/GetLeaderboardsForGame/v2/', {
    key: config.publisherKey,
    appid: config.appId,
  })
  const list = body?.response?.leaderboards
  if (!Array.isArray(list)) return []
  return list.map(parseLeaderboard).filter((l): l is SteamLeaderboard => l != null)
}

/**
 * ISteamLeaderboards/FindOrCreateLeaderboard/v2. Creates the board on first
 * use; an existing board is returned as-is (its settings are not changed).
 */
export async function findOrCreateLeaderboard(
  config: SteamConfig,
  name: string
): Promise<SteamLeaderboard> {
  const body = await partnerRequest('POST', '/ISteamLeaderboards/FindOrCreateLeaderboard/v2/', {
    key: config.publisherKey,
    appid: config.appId,
    name,
    sortmethod: 'Descending',
    displaytype: 'Numeric',
    createifnotfound: 'true',
    onlytrustedwrites: trustedWrites() ? 'true' : 'false',
    onlyfriendsreads: 'false',
  })
  const result = body?.result
  const board = parseLeaderboard(result?.leaderboard)
  if (!board || (result?.result != null && Number(result.result) !== 1)) {
    throw new SteamApiError('unavailable', `FindOrCreateLeaderboard(${name}) returned result ${result?.result}`)
  }
  return board
}

// Board IDs never change once created; cache them per server instance so a
// score upload is one Steam call, not two.
const boardCache = new Map<string, SteamLeaderboard>()

export async function leaderboardForMode(
  config: SteamConfig,
  mode: SteamLeaderboardMode
): Promise<SteamLeaderboard> {
  const name = steamLeaderboardName(mode)
  const cached = boardCache.get(name)
  if (cached) return cached
  const board = await findOrCreateLeaderboard(config, name)
  boardCache.set(name, board)
  return board
}

/** For tests and admin tooling. */
export function clearLeaderboardCache(): void {
  boardCache.clear()
}

/**
 * ISteamLeaderboards/SetLeaderboardScore/v1 with KeepBest: Steam keeps the
 * player's best, so re-submitting a lower run is a no-op there.
 */
export async function setLeaderboardScore(
  config: SteamConfig,
  leaderboardId: number,
  steamId: string,
  score: number,
  method: 'KeepBest' | 'ForceUpdate' = 'KeepBest'
): Promise<SteamScoreUpload> {
  if (!Number.isInteger(score) || score < 0 || score > STEAM_SCORE_MAX) {
    throw new SteamApiError('invalid_ticket', `score ${score} is not a valid int32 leaderboard score`)
  }
  const body = await partnerRequest('POST', '/ISteamLeaderboards/SetLeaderboardScore/v1/', {
    key: config.publisherKey,
    appid: config.appId,
    leaderboardid: String(leaderboardId),
    steamid: steamId,
    score: String(score),
    scoremethod: method,
  })
  const result = body?.result
  if (!result || (result.result != null && Number(result.result) !== 1)) {
    throw new SteamApiError('unavailable', `SetLeaderboardScore returned result ${result?.result}`)
  }
  return {
    leaderboardId,
    scoreChanged: Boolean(result.score_changed),
    rankPrevious: toInt(result.global_rank_previous),
    rankNew: toInt(result.global_rank_new),
  }
}

export type LeaderboardDataRequest = 'RequestGlobal' | 'RequestGlobalAroundUser' | 'RequestFriends'

/**
 * ISteamLeaderboards/GetLeaderboardEntries/v1. Ranges are 1-based and
 * inclusive for RequestGlobal; for RequestGlobalAroundUser they are offsets
 * relative to the player's own entry (e.g. -5..5).
 */
export async function getLeaderboardEntries(
  config: SteamConfig,
  leaderboardId: number,
  options: { rangeStart: number; rangeEnd: number; dataRequest?: LeaderboardDataRequest; steamId?: string }
): Promise<{ total: number; entries: SteamLeaderboardEntry[] }> {
  const params: Record<string, string> = {
    key: config.publisherKey,
    appid: config.appId,
    leaderboardid: String(leaderboardId),
    datarequest: options.dataRequest ?? 'RequestGlobal',
    rangestart: String(options.rangeStart),
    rangeend: String(options.rangeEnd),
  }
  if (options.steamId) params.steamid = options.steamId
  const body = await partnerRequest('GET', '/ISteamLeaderboards/GetLeaderboardEntries/v1/', params)
  const info = body?.leaderboardEntryInformation
  const raw = Array.isArray(info?.leaderboardEntries) ? info.leaderboardEntries : []
  const entries = raw
    .map((e: any) => ({
      steamId: String(e.steamID ?? e.steamid ?? ''),
      score: toInt(e.score) ?? 0,
      rank: toInt(e.rank) ?? 0,
    }))
    .filter((e: SteamLeaderboardEntry) => /^\d{17}$/.test(e.steamId))
  return { total: toInt(info?.totalLeaderBoardEntryCount) ?? entries.length, entries }
}
