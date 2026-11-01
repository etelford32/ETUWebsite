/**
 * LEADERBOARD-00: keep the Steam boards in step with player_scores.
 *
 * syncRowToSteam copies one verified, Steam-ticket-verified row to its Steam
 * boards. Used inline by /api/game/submit-run and by the retry cron. The row
 * remembers the outcome: steam_synced_at on success, steam_sync_error and
 * an attempt count otherwise, so the cron knows what is left to send.
 *
 * processSteamRemovals drains steam_leaderboard_removals, which database
 * triggers fill when a run is deleted or un-verified (see the 20261031
 * migration): it deletes the player's Steam entry and re-posts their best
 * remaining eligible run on that board.
 */

import { createServerClient } from '@/lib/supabaseServer'
import { SteamConfig, getSteamConfig } from '@/lib/steamWebApi'
import { boardValue, getBoard } from '@/lib/leaderboards'
import { deleteLeaderboardScore, setLeaderboardScore } from '@/lib/steamLeaderboards'

export const MAX_SYNC_ATTEMPTS = 10

export interface SyncableRow {
  id: string
  score: number
  time_seconds: number | null
  steam_leaderboards: string[]
  steam_sync_attempts: number
  metadata: any
}

export interface SyncResult {
  synced: boolean
  error: string | null
}

function rowDetails(row: { metadata: any }): number[] {
  return Array.isArray(row.metadata?.details) ? row.metadata.details.map((n: unknown) => Number(n) || 0) : []
}

export async function syncRowToSteam(row: SyncableRow, steamId: string | null): Promise<SyncResult> {
  const config = getSteamConfig()
  if (!config) return { synced: false, error: 'not_configured' }
  if (!steamId || !/^\d{17}$/.test(steamId)) return { synced: false, error: 'no_steam_id' }
  // Only runs a valid Steam ticket vouched for may reach Steam.
  if (row.metadata?.steam_verified !== true) return { synced: false, error: 'not_steam_verified' }

  const details = rowDetails(row)
  const run = { score: row.score, time_seconds: row.time_seconds ?? 0 }

  const outcomes = await Promise.allSettled(
    row.steam_leaderboards.map(board =>
      setLeaderboardScore(config, board, steamId, boardValue(board, run), details)
    )
  )
  const failures = outcomes
    .map((o, i) => (o.status === 'rejected' ? `${row.steam_leaderboards[i]}: ${(o.reason as Error).message}` : null))
    .filter(Boolean) as string[]

  const supabase = createServerClient()
  const synced = failures.length === 0
  const error = synced ? null : failures.join('; ').slice(0, 500)
  await (supabase.from('player_scores') as any)
    .update({
      steam_synced_at: synced ? new Date().toISOString() : null,
      steam_sync_error: error,
      steam_sync_attempts: (row.steam_sync_attempts || 0) + 1,
    })
    .eq('id', row.id)

  if (!synced) console.error('leaderboard sync:', error)
  return { synced, error }
}

// ── removals ────────────────────────────────────────────────────────────────

export interface RemovalResult {
  attempted: number
  removed: number
  reposted: number
  failed: number
}

/**
 * The player's best remaining run that may stand on this Steam board, or
 * null. Same eligibility as a write: verified, Steam-ticket-verified, and
 * assigned to the board.
 */
async function bestRemainingRun(supabase: any, userId: string, board: string) {
  const byTime = getBoard(board)?.ranks === 'time'
  const { data } = await (supabase.from('player_scores') as any)
    .select('score, time_seconds, metadata')
    .eq('user_id', userId)
    .eq('is_verified', true)
    .eq('metadata->>steam_verified', 'true')
    .contains('steam_leaderboards', [board])
    .order(byTime ? 'time_seconds' : 'score', { ascending: false, nullsFirst: false })
    .order('submitted_at', { ascending: true })
    .limit(1)
  return data?.[0] ?? null
}

async function processRemoval(config: SteamConfig, supabase: any, removal: any): Promise<boolean> {
  await deleteLeaderboardScore(config, removal.board, removal.steam_id)

  // Re-post what is left, but only to the Steam account still linked to
  // this player (an account delete or relink leaves nothing to re-post).
  const { data: profile } = await (supabase.from('profiles') as any)
    .select('steam_id, status')
    .eq('id', removal.user_id)
    .maybeSingle()
  if (!profile || profile.steam_id !== removal.steam_id || (profile.status && profile.status !== 'active')) {
    return false
  }
  const best = await bestRemainingRun(supabase, removal.user_id, removal.board)
  if (!best) return false
  await setLeaderboardScore(
    config,
    removal.board,
    removal.steam_id,
    boardValue(removal.board, { score: best.score, time_seconds: best.time_seconds ?? 0 }),
    rowDetails(best)
  )
  return true
}

export async function processSteamRemovals(batch = 25): Promise<RemovalResult> {
  const result: RemovalResult = { attempted: 0, removed: 0, reposted: 0, failed: 0 }
  const config = getSteamConfig()
  if (!config) return result

  const supabase = createServerClient()
  const { data: removals, error } = await (supabase.from('steam_leaderboard_removals') as any)
    .select('id, user_id, steam_id, board, attempts')
    .is('done_at', null)
    .lt('attempts', MAX_SYNC_ATTEMPTS)
    .order('created_at', { ascending: true })
    .limit(batch)
  if (error) {
    console.error('steam removals: query failed:', error.message)
    return result
  }

  for (const removal of removals || []) {
    result.attempted++
    try {
      const reposted = await processRemoval(config, supabase, removal)
      result.removed++
      if (reposted) result.reposted++
      await (supabase.from('steam_leaderboard_removals') as any)
        .update({ done_at: new Date().toISOString(), last_error: null, attempts: (removal.attempts || 0) + 1 })
        .eq('id', removal.id)
    } catch (err) {
      result.failed++
      const message = `${removal.board}: ${(err as Error).message}`.slice(0, 500)
      console.error('steam removals:', message)
      await (supabase.from('steam_leaderboard_removals') as any)
        .update({ last_error: message, attempts: (removal.attempts || 0) + 1 })
        .eq('id', removal.id)
    }
  }
  return result
}
