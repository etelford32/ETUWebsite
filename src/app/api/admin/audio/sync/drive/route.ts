import { NextRequest } from 'next/server'
import { DriveError, getDriveConfig } from '@/lib/audio/drive'
import { syncDriveAudio } from '@/lib/audio/driveSync'
import { isMissingSchema, json, requireAdmin } from '@/lib/audio/server'

/**
 * /api/admin/audio/sync/drive — copy what changed in the Google Drive audio
 * folder into the website's library (lib/audio/driveSync.ts).
 *
 * POST: an admin session with the CSRF header (the button on /admin/audio),
 *       or `Authorization: Bearer ${CRON_SECRET}`.
 * GET:  `Authorization: Bearer ${CRON_SECRET}` only. This is what Vercel
 *       Cron calls (vercel.json), so a file dropped in the folder shows up
 *       without anyone pressing the button. Answers 200 `skipped` when Drive
 *       isn't configured, so an unused cron doesn't log errors.
 *
 * One call copies a bounded batch. The response's `remaining` says how many
 * files are still waiting; call again until it is 0.
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

function isCron(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET
  return !!cronSecret && request.headers.get('authorization') === `Bearer ${cronSecret}`
}

async function run(scheduled: boolean) {
  const config = getDriveConfig()
  if (!config) {
    if (scheduled) return json({ ok: true, skipped: 'not_configured' })
    return json(
      {
        error: 'not_configured',
        message: 'Set GOOGLE_DRIVE_AUDIO_FOLDER and GOOGLE_DRIVE_SERVICE_ACCOUNT to sync from Google Drive.',
      },
      503
    )
  }

  try {
    const report = await syncDriveAudio(config)
    return json({ ok: true, ...report })
  } catch (error: any) {
    if (error instanceof DriveError) {
      return json({ error: error.code, message: error.message }, ERROR_STATUS[error.code] ?? 502)
    }
    // 42703 / PGRST204: audio_tracks exists but has no Drive columns yet.
    if (isMissingSchema(error) || error?.code === '42703' || error?.code === 'PGRST204') {
      return json({ error: 'not_migrated', message: 'Apply the AUDIO-01 and AUDIO-02 database migrations first.' }, 503)
    }
    console.error('Drive audio sync error:', error)
    return json({ error: 'server_error', message: 'The sync failed. Check the server log.' }, 500)
  }
}

export async function GET(request: NextRequest) {
  if (!isCron(request)) return json({ error: 'unauthorized' }, 401)
  return run(true)
}

export async function POST(request: NextRequest) {
  if (!isCron(request)) {
    const guard = await requireAdmin(request, { mutating: true })
    if (guard.response) return guard.response
  }
  return run(false)
}
