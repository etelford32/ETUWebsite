import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabaseServer'
import { checkRateLimit, getIdentifier, RateLimiters } from '@/lib/ratelimit'
import { resolveGameCaller } from '@/lib/gameAuth'

/**
 * POST /api/game/stats — sync lifetime player stats from the game.
 *
 * Auth as for /api/game/submit-score (bearer and/or Steam ticket).
 *
 * Body: {
 *   ticket?: string,
 *   stats: {
 *     level?, xp?, total_kills?, total_deaths?, total_wins?, total_losses?,
 *     total_playtime?, highest_score?: integer ≥ 0,   // cumulative totals
 *     ship_class?: string                              // ≤ 40 chars
 *   }
 * }
 *
 * The game reports lifetime totals, so counters only ever move up: a value
 * lower than what the website already has is ignored (a reinstall or an old
 * save can't erase progress). Clients can't write these columns directly
 * (phase-0 hardening), which is why this goes through the server.
 *
 * GET /api/game/stats — read the same stats back (bearer auth).
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const COUNTERS = ['level', 'xp', 'total_kills', 'total_deaths', 'total_wins', 'total_losses', 'total_playtime', 'highest_score'] as const
const INT32_MAX = 2_147_483_647
const MAX_LEVEL = 10_000
const NO_STORE = { 'Cache-Control': 'no-store' }

function fail(status: number, error: string, extra: Record<string, unknown> = {}) {
  return NextResponse.json({ ok: false, error, ...extra }, { status, headers: NO_STORE })
}

async function readStats(userId: string) {
  const supabase = createServerClient()
  const { data } = await (supabase.from('profiles') as any)
    .select('level, xp, total_kills, total_deaths, total_wins, total_losses, total_playtime, highest_score, ship_class, username, is_verified_owner')
    .eq('id', userId)
    .maybeSingle()
  return data
}

export async function GET(request: NextRequest) {
  const auth = await resolveGameCaller(request, null)
  if (!auth.ok) return fail(auth.status, auth.error)
  const stats = await readStats(auth.caller.userId)
  if (!stats) return fail(404, 'no_account')
  return NextResponse.json({ ok: true, stats }, { headers: NO_STORE })
}

export async function POST(request: NextRequest) {
  if (!RateLimiters.api(`game-stats-ip:${getIdentifier(request)}`).allowed) {
    return fail(429, 'rate_limited')
  }

  let body: any
  try {
    body = await request.json()
  } catch {
    return fail(400, 'bad_request')
  }

  // The per-account limit runs inside, before any ticket is sent to Steam.
  let limitedAs = null as string | null
  const statsLimit = (subject: string) => checkRateLimit(`game-stats:${subject}`, 120, 60 * 60 * 1000)
  const auth = await resolveGameCaller(request, body, {
    rateLimit: subject => {
      limitedAs = subject
      return statsLimit(subject)
    },
  })
  if (!auth.ok) {
    return fail(auth.status, auth.error, auth.retryAfter != null ? { retry_after: auth.retryAfter } : {})
  }
  const { caller } = auth

  if (limitedAs !== `user:${caller.userId}`) {
    const limit = statsLimit(`user:${caller.userId}`)
    if (!limit.allowed) return fail(429, 'rate_limited', { retry_after: limit.retryAfter })
  }

  const incoming = body?.stats
  if (!incoming || typeof incoming !== 'object' || Array.isArray(incoming)) {
    return fail(400, 'bad_request', { message: 'stats object required' })
  }

  const current = await readStats(caller.userId)
  if (!current) return fail(404, 'no_account')

  const updates: Record<string, unknown> = {}
  const ignored: Record<string, string> = {}

  for (const key of COUNTERS) {
    if (incoming[key] === undefined) continue
    const value = incoming[key]
    if (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value > INT32_MAX) {
      return fail(400, 'bad_request', { message: `${key} must be an integer between 0 and ${INT32_MAX}` })
    }
    if (key === 'level' && (value < 1 || value > MAX_LEVEL)) {
      return fail(400, 'bad_request', { message: `level must be between 1 and ${MAX_LEVEL}` })
    }
    const existing = Number(current[key] ?? 0)
    if (value > existing) updates[key] = value
    else if (value < existing) ignored[key] = `kept ${existing} (lifetime totals only move up)`
  }

  if (incoming.ship_class !== undefined) {
    const ship = incoming.ship_class
    if (ship !== null && (typeof ship !== 'string' || ship.length > 40)) {
      return fail(400, 'bad_request', { message: 'ship_class must be a string of at most 40 characters' })
    }
    if (ship !== (current.ship_class ?? null)) updates.ship_class = ship
  }

  if (Object.keys(updates).length > 0) {
    const supabase = createServerClient()
    const { error } = await (supabase.from('profiles') as any).update(updates).eq('id', caller.userId)
    if (error) {
      console.error('game/stats update failed:', error)
      return fail(500, 'server_error')
    }
  }

  const stats = await readStats(caller.userId)
  return NextResponse.json(
    { ok: true, updated: Object.keys(updates), ignored, steam_verified: caller.steamVerified, stats },
    { headers: NO_STORE }
  )
}
