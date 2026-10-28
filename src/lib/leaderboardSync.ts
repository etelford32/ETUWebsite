/**
 * LEADERBOARD-00: copy one verified player_scores row to its Steam boards.
 *
 * Used inline by /api/game/submit-run and by the retry cron. The row
 * remembers the outcome: steam_synced_at on success, steam_sync_error and
 * an attempt count otherwise, so the cron knows what is left to send.
 */

import { createServerClient } from '@/lib/supabaseServer'
import { getSteamConfig } from '@/lib/steamWebApi'
import { boardValue } from '@/lib/leaderboards'
import { setLeaderboardScore } from '@/lib/steamLeaderboards'

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

export async function syncRowToSteam(row: SyncableRow, steamId: string | null): Promise<SyncResult> {
  const config = getSteamConfig()
  if (!config) return { synced: false, error: 'not_configured' }
  if (!steamId || !/^\d{17}$/.test(steamId)) return { synced: false, error: 'no_steam_id' }

  const details: number[] = Array.isArray(row.metadata?.details)
    ? row.metadata.details.map((n: unknown) => Number(n) || 0)
    : []
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
