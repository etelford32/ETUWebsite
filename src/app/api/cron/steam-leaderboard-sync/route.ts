import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabaseServer'
import { getSteamConfig } from '@/lib/steamWebApi'
import { MAX_SYNC_ATTEMPTS, syncRowToSteam } from '@/lib/leaderboardSync'

/**
 * GET /api/cron/steam-leaderboard-sync — retry Steam leaderboard writes
 * (LEADERBOARD-00). /api/game/submit-run writes each verified run to Steam
 * inline; this picks up the ones Steam was down or slow for.
 *
 * Auth: Vercel Cron's `Authorization: Bearer ${CRON_SECRET}`.
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const BATCH = 25

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!getSteamConfig()) {
    return NextResponse.json({ ok: true, skipped: 'not_configured' })
  }

  const supabase = createServerClient()
  const { data: rows, error } = await (supabase.from('player_scores') as any)
    .select('id, user_id, score, time_seconds, steam_leaderboards, steam_sync_attempts, metadata, profile:profiles(steam_id)')
    .eq('is_verified', true)
    .is('steam_synced_at', null)
    .neq('steam_leaderboards', '{}')
    .lt('steam_sync_attempts', MAX_SYNC_ATTEMPTS)
    .order('submitted_at', { ascending: true })
    .limit(BATCH)
  if (error) {
    console.error('steam-leaderboard-sync:', error.message)
    return NextResponse.json({ error: 'query_failed' }, { status: 500 })
  }

  let synced = 0
  let failed = 0
  for (const row of rows || []) {
    const result = await syncRowToSteam(row, row.profile?.steam_id ?? null)
    if (result.synced) synced++
    else failed++
  }

  return NextResponse.json({ ok: true, attempted: (rows || []).length, synced, failed, ranAt: new Date().toISOString() })
}
