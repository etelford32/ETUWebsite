import { NextRequest } from 'next/server'
import { GAME_AUDIO_BUCKET, STREAM_URL_TTL_SECONDS, USER_AUDIO_BUCKET } from '@/lib/audio/config'
import { audioDb, isUuid, json, requireUser, signedUrl } from '@/lib/audio/server'

/**
 * GET /api/audio/stream?type=track|upload&id=<uuid>
 *
 * A signed-in listener trades a track id for a URL that plays it for the
 * next hour. Game tracks must be published; an upload must be the caller's
 * own. The buckets are private, so this is the only way to a file.
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const guard = await requireUser(request, { limit: { key: 'stream', max: 900, windowMs: 60 * 60 * 1000 } })
  if (guard.response) return guard.response

  const type = request.nextUrl.searchParams.get('type')
  const id = request.nextUrl.searchParams.get('id')
  if ((type !== 'track' && type !== 'upload') || !isUuid(id)) {
    return json({ error: 'bad_request' }, 400)
  }

  try {
    const db = audioDb()
    let bucket: string
    let path: string | null = null
    if (type === 'track') {
      bucket = GAME_AUDIO_BUCKET
      const { data, error } = await db
        .from('audio_tracks')
        .select('storage_path')
        .eq('id', id)
        .eq('status', 'published')
        .maybeSingle()
      if (error) throw error
      path = data?.storage_path ?? null
    } else {
      bucket = USER_AUDIO_BUCKET
      const { data, error } = await db
        .from('audio_uploads')
        .select('storage_path')
        .eq('id', id)
        .eq('user_id', guard.session.userId)
        .eq('status', 'ready')
        .maybeSingle()
      if (error) throw error
      path = data?.storage_path ?? null
    }
    if (!path) return json({ error: 'not_found' }, 404)

    const url = await signedUrl(bucket, path, STREAM_URL_TTL_SECONDS)
    if (!url) return json({ error: 'unavailable', message: 'That track is not available right now.' }, 502)
    return json({ url, expires_in: STREAM_URL_TTL_SECONDS })
  } catch (error: any) {
    console.error('Audio stream error:', error)
    return json({ error: 'server_error' }, 500)
  }
}
