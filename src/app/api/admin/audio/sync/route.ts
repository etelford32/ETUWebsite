import { NextRequest } from 'next/server'
import { GameRepoError, getGameRepoConfig } from '@/lib/audio/gameRepo'
import { isMissingSchema, json, requireAdmin } from '@/lib/audio/server'
import { syncGameAudio } from '@/lib/audio/sync'

/**
 * POST /api/admin/audio/sync — copy what changed in the game repository's
 * audio folder into the website's library (lib/audio/sync.ts).
 *
 * Auth: an admin session with the CSRF header (the button on /admin/audio),
 * or `Authorization: Bearer ${CRON_SECRET}` for a scheduled or scripted run.
 *
 * One call uploads a bounded batch. The response's `remaining` says how
 * many files are still waiting; call again until it is 0.
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const ERROR_STATUS: Record<string, number> = {
  not_configured: 503,
  unauthorized: 502,
  not_found: 502,
  rate_limited: 429,
  too_large: 502,
  unavailable: 502,
}

export async function POST(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  const isCron = !!cronSecret && request.headers.get('authorization') === `Bearer ${cronSecret}`
  if (!isCron) {
    const guard = await requireAdmin(request, { mutating: true })
    if (guard.response) return guard.response
  }

  const config = getGameRepoConfig()
  if (!config) {
    return json(
      {
        error: 'not_configured',
        message: 'Set GAME_REPO_TOKEN (a GitHub token that can read the game repository) to sync.',
      },
      503
    )
  }

  try {
    const report = await syncGameAudio(config)
    return json({ ok: true, ...report })
  } catch (error: any) {
    if (error instanceof GameRepoError) {
      return json({ error: error.code, message: error.message }, ERROR_STATUS[error.code] ?? 502)
    }
    if (isMissingSchema(error)) {
      return json({ error: 'not_migrated', message: 'Apply the AUDIO-01 database migration first.' }, 503)
    }
    console.error('Audio sync error:', error)
    return json({ error: 'server_error', message: 'The sync failed. Check the server log.' }, 500)
  }
}
