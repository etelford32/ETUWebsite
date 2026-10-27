import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabaseServer'
import { RateLimiters, getIdentifier } from '@/lib/ratelimit'
import { getSteamConfig, SteamApiError } from '@/lib/steamWebApi'
import { isValidSteamId, maskSteamId } from '@/lib/steamIdentity'
import {
  STEAM_LEADERBOARD_MODES,
  getLeaderboardEntries,
  isSteamLeaderboardMode,
  leaderboardForMode,
} from '@/lib/steamLeaderboards'

/**
 * GET /api/leaderboard/steam?mode=speedrun&start=1&count=50[&around=<steamid>]
 *
 * Steam's own global leaderboard for a mode, joined to ETU profiles by Steam
 * ID so the site can show callsigns and avatars. Public; cached for a
 * minute at the edge. Steam players without an ETU account show as a
 * masked Steam ID.
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_COUNT = 100

export async function GET(request: NextRequest) {
  if (!RateLimiters.public(`steam-lb:${getIdentifier(request)}`).allowed) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 })
  }

  const params = request.nextUrl.searchParams
  const mode = params.get('mode') || 'speedrun'
  if (!isSteamLeaderboardMode(mode)) {
    return NextResponse.json(
      { error: 'bad_request', message: `mode must be one of ${STEAM_LEADERBOARD_MODES.join(', ')}` },
      { status: 400 }
    )
  }
  const start = Math.max(1, parseInt(params.get('start') || '1', 10) || 1)
  const count = Math.min(MAX_COUNT, Math.max(1, parseInt(params.get('count') || '50', 10) || 50))
  const around = params.get('around')
  if (around && !isValidSteamId(around)) {
    return NextResponse.json({ error: 'bad_request', message: 'around must be a 17-digit Steam ID' }, { status: 400 })
  }

  const config = getSteamConfig()
  if (!config) {
    return NextResponse.json({ error: 'not_configured' }, { status: 503 })
  }

  try {
    const board = await leaderboardForMode(config, mode)
    const half = Math.floor(count / 2)
    const page = around
      ? await getLeaderboardEntries(config, board.id, {
          dataRequest: 'RequestGlobalAroundUser',
          steamId: around,
          rangeStart: -half,
          rangeEnd: count - half - 1,
        })
      : await getLeaderboardEntries(config, board.id, { rangeStart: start, rangeEnd: start + count - 1 })

    // Join to ETU profiles for callsign/avatar.
    const steamIds = page.entries.map((e) => e.steamId)
    const profilesBySteamId = new Map<string, any>()
    if (steamIds.length) {
      const supabase = createServerClient()
      const { data } = await (supabase.from('profiles') as any)
        .select('id, username, display_name, avatar_url, steam_id, is_verified_owner, is_public')
        .in('steam_id', steamIds)
      for (const p of data || []) profilesBySteamId.set(p.steam_id, p)
    }

    const entries = page.entries.map((e) => {
      const p = profilesBySteamId.get(e.steamId)
      return {
        rank: e.rank,
        score: e.score,
        steam_id: e.steamId,
        user_id: p?.id ?? null,
        username: p?.username || p?.display_name || `Steam ${maskSteamId(e.steamId)}`,
        avatar_url: p?.avatar_url ?? null,
        is_verified_owner: p?.is_verified_owner === true,
        has_etu_profile: !!p,
        profile_url: p && p.is_public ? `/profile/${p.id}` : null,
      }
    })

    return NextResponse.json(
      {
        mode,
        leaderboard: { id: board.id, name: board.name, total: page.total, only_trusted_writes: board.onlyTrustedWrites },
        start: around ? null : start,
        count: entries.length,
        entries,
      },
      { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } }
    )
  } catch (err) {
    if (err instanceof SteamApiError) {
      console.error('leaderboard/steam:', err.message)
      return NextResponse.json({ error: 'steam_unavailable' }, { status: 502 })
    }
    console.error('leaderboard/steam error:', err)
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
}
