import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabaseServer'
import { getSessionFromRequest, validateSession } from '@/lib/session'
import {
  verifyRunToken,
  verifyHeartbeatToken,
  megabotScoreCeiling,
  RUN_TOKEN_MIN_AGE_MS,
  RUN_TOKEN_MAX_AGE_MS,
  HEARTBEAT_SCORE_TOLERANCE,
  HEARTBEAT_WAVE_TOLERANCE,
} from '@/lib/runToken'

const VALID_MODES = ['speedrun', 'survival', 'discovery', 'boss_rush', 'megabot', 'global']
const VALID_PLATFORMS = ['PC', 'Mac', 'Linux', 'PS', 'Xbox', 'Switch']

export async function POST(request: NextRequest) {
  try {
    // Auth: cookie-based session (matches the rest of the API surface).
    const session = getSessionFromRequest(request)
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    const { valid, user } = await validateSession(session)
    if (!valid || !user) {
      return NextResponse.json({ error: 'Invalid or expired session' }, { status: 401 })
    }

    const body = await request.json()
    const {
      score,
      mode,
      platform = 'PC',
      level = 1,
      time_seconds = null,
      metadata = null,
    } = body

    // Basic validation
    if (typeof score !== 'number' || !isFinite(score) || score < 0) {
      return NextResponse.json(
        { error: 'Score must be a non-negative number' },
        { status: 400 }
      )
    }
    if (!VALID_MODES.includes(mode)) {
      return NextResponse.json(
        { error: `Invalid mode. Must be one of: ${VALID_MODES.join(', ')}` },
        { status: 400 }
      )
    }
    if (!VALID_PLATFORMS.includes(platform)) {
      return NextResponse.json(
        { error: `Invalid platform. Must be one of: ${VALID_PLATFORMS.join(', ')}` },
        { status: 400 }
      )
    }

    // Megabot Arena verification gate. Each check is INDEPENDENT — a failure
    // doesn't reject the score (we still record the run for the leaderboard,
    // since unverified-but-shown is the existing policy), it just keeps
    // is_verified=false and stamps a reason in metadata for audit. A clean
    // pass on all four flips is_verified=true so the score also surfaces in
    // verified-only views.
    let is_verified = false
    let verifyReason: string | null = null
    if (mode === 'megabot') {
      const token = (metadata && typeof metadata === 'object' && metadata.runToken) as string | undefined
      const heartbeat = (metadata && typeof metadata === 'object' && metadata.heartbeatToken) as string | undefined
      const wave = typeof level === 'number' ? level : parseInt(level, 10)
      if (!token) {
        verifyReason = 'no run token'
      } else {
        const r = verifyRunToken(token, user.id)
        if (!r.valid) {
          verifyReason = `token: ${r.reason}`
        } else {
          const age = Date.now() - r.payload.t
          if (age < RUN_TOKEN_MIN_AGE_MS) {
            verifyReason = 'token too fresh (instant submit)'
          } else if (age > RUN_TOKEN_MAX_AGE_MS) {
            verifyReason = 'token expired'
          } else {
            const ceiling = megabotScoreCeiling(Number.isFinite(wave) ? wave : 0)
            if (score > ceiling) {
              verifyReason = `score above wave ceiling (${score} > ${ceiling})`
            } else if (!heartbeat) {
              // Pre-heartbeat clients (no chain) can't pass the verified bar
              // anymore — but they still record the run, just unverified.
              verifyReason = 'no heartbeat'
            } else {
              const hb = verifyHeartbeatToken(heartbeat, user.id)
              if (!hb.valid) {
                verifyReason = `heartbeat: ${hb.reason}`
              } else if (hb.payload.r !== r.payload.r) {
                verifyReason = 'heartbeat: run mismatch'
              } else if (
                Math.abs((Number.isFinite(wave) ? wave : 0) - hb.payload.w) > HEARTBEAT_WAVE_TOLERANCE
              ) {
                verifyReason = `heartbeat: wave drift (${wave} vs ${hb.payload.w})`
              } else if (Math.abs(score - hb.payload.s) > HEARTBEAT_SCORE_TOLERANCE) {
                verifyReason = `heartbeat: score drift (${score} vs ${hb.payload.s})`
              } else {
                is_verified = true
              }
            }
          }
        }
      }
    }

    // Strip the runToken before persistence so it's not stored alongside the
    // score (the verification result is captured in metadata.verifyReason
    // when applicable). Any other client-supplied metadata passes through.
    const persistedMetadata: Record<string, any> = { ...(metadata || {}) }
    delete persistedMetadata.runToken
    delete persistedMetadata.heartbeatToken
    if (mode === 'megabot') {
      persistedMetadata.verifyReason = verifyReason // null when verified, string otherwise
    }

    const supabase = createServerClient()
    const { data, error } = await (supabase as any)
      .from('player_scores')
      .insert({
        user_id: user.id, // CRITICAL: trust only the server-side session
        score,
        mode,
        platform,
        level: typeof level === 'number' ? level : parseInt(level, 10),
        time_seconds:
          time_seconds == null
            ? null
            : typeof time_seconds === 'number'
              ? time_seconds
              : parseInt(time_seconds, 10),
        is_verified,
        metadata: persistedMetadata,
      })
      .select()
      .single()

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, score: data, is_verified })
  } catch (error: any) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
