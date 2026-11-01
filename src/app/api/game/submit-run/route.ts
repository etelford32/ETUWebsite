import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabaseServer'
import { RateLimiters, checkRateLimit, getIdentifier } from '@/lib/ratelimit'
import { resolveGameCaller } from '@/lib/gameAuth'
import {
  GameRun,
  boardsForRun,
  packDetails,
  parseRun,
  unverifiedReason,
} from '@/lib/leaderboards'
import { syncRowToSteam } from '@/lib/leaderboardSync'

/**
 * POST /api/game/submit-run — one finished game run (LEADERBOARD-00 phase 1).
 *
 * Auth: `Authorization: Bearer <access_token>` from /api/game/steam-session.
 * The game is not a browser, so there is no cookie and no CSRF token.
 * Optionally the body carries `ticket`, a fresh Steam ticket from
 * GetAuthTicketForWebApi('etu-account'): when present it must name the
 * Steam ID linked to this account (else 403 account_mismatch), and the run
 * is stored with metadata.steam_verified = true. See src/lib/gameAuth.ts.
 *
 * The run is stored in player_scores (idempotent on run_id). A run that is
 * verified AND carried a Steam ticket Steam accepted for this account is
 * also written to its Steam leaderboards; without a valid ticket it can
 * still rank on the website, but never reaches Steam. Steam's boards are
 * trusted-write only, so this route is the only way a score reaches them.
 *
 * Rate limits run before the ticket is sent to Steam (per client IP, then
 * per account), so this route can't be used to make the server call Steam
 * on demand.
 *
 * Success: { ok, run_id, duplicate, verified, reason, personal_best,
 *            steam_verified,
 *            rank: { board, rank, total } | null,
 *            difficulty_rank: { board, rank, total } | null,
 *            steam: { synced, error } }
 * Errors:  { ok:false, error } with error one of bad_request (400),
 *          not_authenticated | invalid_ticket (401), needs_username |
 *          no_steam_id | account_suspended | account_mismatch | banned (403),
 *          rate_limited (429), server_error (500), steam_unavailable (502).
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const NO_STORE = { 'Cache-Control': 'no-store' }
const RUNS_PER_HOUR = 30

function fail(status: number, error: string, extra: Record<string, unknown> = {}) {
  return NextResponse.json({ ok: false, error, ...extra }, { status, headers: NO_STORE })
}

async function rankOn(supabase: any, board: string, userId: string) {
  const { data } = await supabase.rpc('get_leaderboard_rank', { p_board: board, p_user_id: userId })
  const row = Array.isArray(data) ? data[0] : null
  return row ? { board, rank: Number(row.rank), total: Number(row.total) } : null
}

const runLimit = (subject: string) => checkRateLimit(`submit-run:${subject}`, RUNS_PER_HOUR, 60 * 60 * 1000)

export async function POST(request: NextRequest) {
  // Coarse per-client limit before any auth work (Supabase or Steam).
  const ipLimit = RateLimiters.api(`submit-run-ip:${getIdentifier(request)}`)
  if (!ipLimit.allowed) return fail(429, 'rate_limited', { retry_after: ipLimit.retryAfter })

  let body: any = null
  try {
    body = await request.json()
  } catch {
    body = null
  }

  // Reject a malformed run before its ticket is sent to Steam.
  const run: GameRun | null = parseRun(body)
  if (!run) return fail(400, 'bad_request')

  // Bearer token (required in practice) plus an optional Steam ticket. The
  // per-account run limit is applied inside, before the ticket goes to Steam.
  let limitedAs = null as string | null
  const auth = await resolveGameCaller(request, body, {
    rateLimit: subject => {
      limitedAs = subject
      return runLimit(subject)
    },
  })
  if (!auth.ok) {
    const extra = auth.retryAfter != null ? { retry_after: auth.retryAfter } : {}
    return fail(auth.status, auth.error === 'unauthorized' ? 'not_authenticated' : auth.error, extra)
  }
  const { caller } = auth
  const userId = caller.userId

  // A ticket-only request was limited by IP above; count it against the
  // account too now that Steam has said which account it is.
  if (limitedAs !== `user:${userId}`) {
    const limit = runLimit(`user:${userId}`)
    if (!limit.allowed) return fail(429, 'rate_limited', { retry_after: limit.retryAfter })
  }

  const supabase = createServerClient()

  try {
    const { data: profile } = await (supabase.from('profiles') as any)
      .select('username, steam_id, status')
      .eq('id', userId)
      .single()
    if (!profile) return fail(401, 'not_authenticated')
    if (profile.status && profile.status !== 'active') return fail(403, 'account_suspended')
    if (!profile.steam_id) return fail(403, 'no_steam_id')
    if (!profile.username) return fail(403, 'needs_username')

    const reason = unverifiedReason(run)
    const verified = reason === null
    // Steam's boards take only runs a live Steam client vouched for.
    const boards = verified && caller.steamVerified ? boardsForRun(run) : []

    const { data: previous } = await (supabase.from('player_scores') as any)
      .select('score')
      .eq('user_id', userId)
      .eq('mode', run.mode)
      .eq('is_verified', true)
      .neq('run_id', run.run_id)
      .order('score', { ascending: false })
      .limit(1)
    const previousBest = previous?.[0]?.score ?? null

    const { data: inserted, error: insertError } = await (supabase.from('player_scores') as any)
      .upsert(
        {
          user_id: userId,
          run_id: run.run_id,
          score: run.score,
          mode: run.mode,
          difficulty: run.difficulty,
          platform: 'PC',
          level: run.wave,
          time_seconds: run.time_seconds,
          is_verified: verified,
          game_version: run.game_version,
          steam_leaderboards: boards,
          submitted_at: run.ended_at,
          metadata: {
            source: 'game',
            details: packDetails(run),
            kills: run.kills,
            ship_skin: run.ship_skin,
            doctrine: run.doctrine,
            build: run.build,
            end_reason: run.end_reason,
            coop_session_id: run.coop_session_id,
            verifyReason: reason,
            // A live Steam client proved it was behind this submission.
            steam_verified: caller.steamVerified,
          },
        },
        { onConflict: 'user_id,run_id', ignoreDuplicates: true }
      )
      .select('id')
    if (insertError) {
      console.error('submit-run: insert failed:', insertError.message)
      return fail(500, 'server_error')
    }
    const duplicate = !inserted || inserted.length === 0

    // The stored row is the truth for a retry: report what was recorded
    // the first time, and finish a Steam write that did not complete.
    const { data: row } = await (supabase.from('player_scores') as any)
      .select('id, score, time_seconds, is_verified, steam_leaderboards, steam_synced_at, steam_sync_error, steam_sync_attempts, metadata')
      .eq('user_id', userId)
      .eq('run_id', run.run_id)
      .single()
    if (!row) return fail(500, 'server_error')

    let steam = { synced: Boolean(row.steam_synced_at), error: row.steam_sync_error as string | null }
    if (row.is_verified && !row.steam_synced_at && row.steam_leaderboards?.length && row.metadata?.steam_verified === true) {
      steam = await syncRowToSteam(row, profile.steam_id)
    }

    const primary = run.mode === 'coop_survival' ? 'COOP_SURVIVAL' : 'SURVIVAL_GLOBAL'
    const [rank, difficultyRank] = row.is_verified
      ? await Promise.all([
          rankOn(supabase, primary, userId),
          run.mode === 'survival' ? rankOn(supabase, `SURVIVAL_${run.difficulty.toUpperCase()}`, userId) : null,
        ])
      : [null, null]

    return NextResponse.json(
      {
        ok: true,
        run_id: run.run_id,
        duplicate,
        verified: row.is_verified,
        reason: row.metadata?.verifyReason ?? null,
        personal_best: row.is_verified && (previousBest == null || row.score > previousBest),
        steam_verified: caller.steamVerified,
        rank,
        difficulty_rank: difficultyRank,
        steam,
      },
      { headers: NO_STORE }
    )
  } catch (err) {
    console.error('submit-run: error:', (err as Error).message)
    return fail(500, 'server_error')
  }
}
