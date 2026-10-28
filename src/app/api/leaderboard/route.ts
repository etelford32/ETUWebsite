import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabaseServer'
import { getBoard } from '@/lib/leaderboards'

// Public profile fields only. This route runs with the service role, so a
// bare profiles(*) would hand every scored player's email and role to
// anyone (LEADERBOARD-00 phase 0).
const PUBLIC_PROFILE = 'profile:profiles(id, username, display_name, avatar_url, level)'


export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient()
    const searchParams = request.nextUrl.searchParams
    const mode = searchParams.get('mode') || 'all'
    const windowKey = searchParams.get('window') || '30d'
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '50')
    const sortFieldParam = searchParams.get('sortField') || 'score'
    const sortDir = searchParams.get('sortDir') || 'desc'

    // Whitelist valid sort fields to prevent SQL injection
    const validSortFields = ['score', 'submitted_at', 'level', 'time_seconds']
    const sortField = validSortFields.includes(sortFieldParam) ? sortFieldParam : 'score'

    // Validate sort direction
    const validSortDir = sortDir === 'asc' ? 'asc' : 'desc'

    // Calculate time window
    const now = new Date()
    let cutoffDate = new Date(0) // Default: all time

    switch (windowKey) {
      case 'today':
        cutoffDate = new Date(now.getTime() - 24 * 60 * 60 * 1000)
        break
      case '7d':
        cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case '30d':
        cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
      case '90d':
        cutoffDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
        break
    }

    // LEADERBOARD-00 boards: one row per player (their best verified run),
    // ranked by the same rules as the Steam leaderboard of the same name.
    const boardParam = searchParams.get('board')
    if (boardParam) {
      const board = getBoard(boardParam)
      if (!board) {
        return NextResponse.json({ error: 'Invalid board' }, { status: 400 })
      }
      const size = Math.min(Math.max(pageSize || 50, 1), 100)
      const { data, error } = await (supabase as any).rpc('get_leaderboard', {
        p_board: board.name,
        p_since: windowKey === 'all' ? null : cutoffDate.toISOString(),
        p_limit: size,
        p_offset: (Math.max(page, 1) - 1) * size,
      })
      if (error) {
        console.error('Supabase error:', error)
        return NextResponse.json({ error: 'Failed to load leaderboard' }, { status: 500 })
      }
      const rows = (data || []) as any[]
      return NextResponse.json({
        board: board.name,
        ranks: board.ranks,
        data: rows.map(row => ({
          id: `${board.name}:${row.user_id}`,
          user_id: row.user_id,
          rank: Number(row.rank),
          value: Number(row.value),
          score: row.score,
          time_seconds: row.time_seconds,
          level: row.wave,
          difficulty: row.difficulty,
          details: row.details,
          submitted_at: row.submitted_at,
          steam_synced: row.steam_synced,
          mode: board.name === 'COOP_SURVIVAL' ? 'coop_survival' : 'survival',
          platform: 'PC',
          is_verified: true,
          metadata: null,
          profile: {
            id: row.user_id,
            username: row.username,
            display_name: row.display_name,
            avatar_url: row.avatar_url,
          },
        })),
        total: rows.length ? Number(rows[0].total) : 0,
        page,
        pageSize: size,
      })
    }

    // Build query
    let query = supabase
      .from('player_scores')
      .select(`*, ${PUBLIC_PROFILE}`, { count: 'exact' })
      .gte('submitted_at', cutoffDate.toISOString())

    // Verification policy:
    // - Main-game modes (speedrun/survival/discovery/boss_rush) require
    //   server-side verification before they appear on the leaderboard,
    //   per the original anti-cheat design.
    // - Megabot Arena is a web-only mini-game; its scores can't go through
    //   the same verification path, so we surface them unverified. (A
    //   future anti-cheat sprint can layer a server-replay or token check
    //   on top.)
    // - 'all' shows main-game verified scores only, which is the
    //   conservative pre-existing behaviour.
    if (mode !== 'megabot') {
      query = query.eq('is_verified', true)
    }

    // Mode filter (no-op for 'all'). Whitelisted above so this is safe.
    if (mode && mode !== 'all') {
      query = query.eq('mode', mode)
    }

    // Apply sorting (already validated sortField and validSortDir)
    query = query.order(sortField as any, { ascending: validSortDir === 'asc' })

    // Apply pagination
    const start = (page - 1) * pageSize
    query = query.range(start, start + pageSize - 1)

    const { data, error, count } = await query

    if (error) {
      // The player_scores table doesn't exist until the scoring feature
      // ships. Treat "relation does not exist" as an empty leaderboard so
      // the dashboard and leaderboard pages render instead of erroring.
      if (error.code === '42P01') {
        return NextResponse.json({ data: [], total: 0, page, pageSize })
      }
      console.error('Supabase error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Add ranks
    const dataWithRanks = (data || []).map((entry, idx) => ({
      ...entry as any,
      rank: start + idx + 1
    }))

    return NextResponse.json({
      data: dataWithRanks,
      total: count || 0,
      page,
      pageSize,
    })
  } catch (error: any) {
    console.error('API error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
