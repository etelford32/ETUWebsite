import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabaseServer'
import { RateLimiters, checkRateLimit, getIdentifier } from '@/lib/ratelimit'
import { resolveGameCaller } from '@/lib/gameAuth'
import { getSteamConfig } from '@/lib/steamWebApi'
import {
  STEAM_SCORE_MAX,
  isSteamLeaderboardMode,
  leaderboardForMode,
  setLeaderboardScore,
} from '@/lib/steamLeaderboards'

/**
 * POST /api/game/submit-score — score submission from the game client.
 *
 * Auth: `Authorization: Bearer <access_token>` from /api/game/steam-session
 * and/or a fresh Steam `ticket` in the body (see src/lib/gameAuth.ts).
 *
 * Body: {
 *   ticket?: string,            // GetAuthTicketForWebApi('etu-account'), hex
 *   score: number,              // integer, 0 .. 2^31-1
 *   mode: 'speedrun' | 'survival' | 'discovery' | 'boss_rush' | 'global',
 *   platform?: 'PC' | 'Mac' | 'Linux' | 'PS' | 'Xbox' | 'Switch',   // Steam Deck → 'Linux'
 *   level?: number,             // integer ≥ 1
 *   time_seconds?: number,      // integer ≥ 0
 *   metadata?: object           // build, seed, difficulty … (≤ 4 KB)
 * }
 *
 * A Steam-verified submission (valid ticket for the linked Steam ID) is
 * stored is_verified=true, shows on the public board immediately, and is
 * mirrored to the mode's Steam leaderboard (KeepBest). Anything else is
 * still recorded, but unverified, with the reason in metadata for audit.
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const GAME_MODES = ['speedrun', 'survival', 'discovery', 'boss_rush', 'global']
const PLATFORMS = ['PC', 'Mac', 'Linux', 'PS', 'Xbox', 'Switch']
const MAX_METADATA_BYTES = 4096
const NO_STORE = { 'Cache-Control': 'no-store' }

function fail(status: number, error: string, extra: Record<string, unknown> = {}) {
  return NextResponse.json({ ok: false, error, ...extra }, { status, headers: NO_STORE })
}

function asInt(value: unknown): number | null {
  if (typeof value === 'number' && Number.isInteger(value)) return value
  if (typeof value === 'string' && /^-?\d+$/.test(value)) return parseInt(value, 10)
  return null
}

export async function POST(request: NextRequest) {
  if (!RateLimiters.api(`game-score-ip:${getIdentifier(request)}`).allowed) {
    return fail(429, 'rate_limited')
  }

  let body: any
  try {
    body = await request.json()
  } catch {
    return fail(400, 'bad_request')
  }

  const auth = await resolveGameCaller(request, body)
  if (!auth.ok) return fail(auth.status, auth.error)
  const { caller } = auth

  const userLimit = checkRateLimit(`game-score:${caller.userId}`, 30, 60 * 1000)
  if (!userLimit.allowed) return fail(429, 'rate_limited', { retry_after: userLimit.retryAfter })

  // ---- validation -------------------------------------------------------
  const score = asInt(body.score)
  if (score == null || score < 0 || score > STEAM_SCORE_MAX) {
    return fail(400, 'bad_request', { message: `score must be an integer between 0 and ${STEAM_SCORE_MAX}` })
  }
  const mode = String(body.mode ?? '')
  if (!GAME_MODES.includes(mode)) {
    return fail(400, 'bad_request', { message: `mode must be one of ${GAME_MODES.join(', ')}` })
  }
  const platform = body.platform == null ? 'PC' : String(body.platform)
  if (!PLATFORMS.includes(platform)) {
    return fail(400, 'bad_request', { message: `platform must be one of ${PLATFORMS.join(', ')}` })
  }
  const level = body.level == null ? 1 : asInt(body.level)
  if (level == null || level < 1) return fail(400, 'bad_request', { message: 'level must be an integer ≥ 1' })
  const timeSeconds = body.time_seconds == null ? null : asInt(body.time_seconds)
  if (timeSeconds != null && timeSeconds < 0) {
    return fail(400, 'bad_request', { message: 'time_seconds must be an integer ≥ 0' })
  }
  const clientMeta = body.metadata && typeof body.metadata === 'object' && !Array.isArray(body.metadata) ? body.metadata : {}
  if (JSON.stringify(clientMeta).length > MAX_METADATA_BYTES) {
    return fail(400, 'bad_request', { message: 'metadata too large' })
  }

  const isVerified = caller.steamVerified
  // player_scores.metadata is returned by the public leaderboard API, so
  // keep identifiers out of it; the profile join already carries what the
  // UI needs.
  const metadata: Record<string, unknown> = {
    ...clientMeta,
    source: 'game',
    steam_verified: isVerified,
    verifyReason: isVerified ? null : caller.unverifiedReason,
    owns_app: caller.profile.is_verified_owner,
  }
  delete (metadata as any).ticket

  const supabase = createServerClient()

  try {
    const { data: row, error } = await (supabase.from('player_scores') as any)
      .insert({
        user_id: caller.userId,
        score,
        mode,
        platform,
        level,
        time_seconds: timeSeconds,
        is_verified: isVerified,
        metadata,
      })
      .select('id, submitted_at')
      .single()
    if (error || !row) {
      console.error('game/submit-score insert failed:', error)
      return fail(500, 'server_error')
    }

    // ---- mirror to Steam (verified scores only) ---------------------------
    let steam: Record<string, unknown> | null = null
    if (isVerified && caller.steamId && isSteamLeaderboardMode(mode)) {
      const config = getSteamConfig()
      if (!config) {
        steam = { mirrored: false, error: 'not_configured' }
      } else {
        try {
          const board = await leaderboardForMode(config, mode)
          const upload = await setLeaderboardScore(config, board.id, caller.steamId, score, 'KeepBest')
          steam = {
            mirrored: true,
            leaderboard_id: board.id,
            leaderboard_name: board.name,
            score_changed: upload.scoreChanged,
            rank_previous: upload.rankPrevious,
            rank_new: upload.rankNew,
          }
        } catch (err) {
          console.error('game/submit-score Steam mirror failed:', (err as Error).message)
          steam = { mirrored: false, error: 'steam_unavailable' }
        }
      }
      await (supabase.from('player_scores') as any)
        .update({ metadata: { ...metadata, steam } })
        .eq('id', row.id)
    } else if (isVerified && !isSteamLeaderboardMode(mode)) {
      steam = { mirrored: false, error: 'no_steam_board_for_mode' }
    }

    // ---- profile best + rank --------------------------------------------
    let rankAllTime: number | null = null
    if (isVerified) {
      if (score > caller.profile.highest_score) {
        await (supabase.from('profiles') as any).update({ highest_score: score }).eq('id', caller.userId)
      }
      const { count } = await (supabase.from('player_scores') as any)
        .select('id', { count: 'exact', head: true })
        .eq('mode', mode)
        .eq('is_verified', true)
        .gt('score', score)
      rankAllTime = (count ?? 0) + 1
    }

    return NextResponse.json(
      {
        ok: true,
        score_id: row.id,
        submitted_at: row.submitted_at,
        is_verified: isVerified,
        verify_reason: isVerified ? null : caller.unverifiedReason,
        rank_all_time: rankAllTime,
        steam,
      },
      { status: 201, headers: NO_STORE }
    )
  } catch (err) {
    console.error('game/submit-score error:', (err as Error).message)
    return fail(500, 'server_error')
  }
}
