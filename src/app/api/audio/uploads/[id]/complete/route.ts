import { NextRequest } from 'next/server'
import { audioExtension, audioLimits, USER_AUDIO_BUCKET } from '@/lib/audio/config'
import { SNIFF_BYTES, sniffAudioFormat } from '@/lib/audio/inspect'
import {
  audioDb,
  isUuid,
  json,
  objectSize,
  readJson,
  readObjectHead,
  requireUser,
  UPLOAD_COLUMNS,
  uploadJson,
  uploadUsage,
} from '@/lib/audio/server'

/**
 * POST /api/audio/uploads/[id]/complete  { duration_seconds? }
 *
 * Step 2 of an upload: the browser says the file is in storage, and this
 * checks it before the track becomes playable.
 *
 *   - the object exists, and its real size is within the per-track limit
 *     and the account's quota (the size sent in step 1 was only a claim);
 *   - its first bytes are the audio format its name says it is.
 *
 * A file that fails is deleted along with its row. `duration_seconds` is
 * what the browser measured and is only used for display.
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Context = { params: { id: string } }

export async function POST(request: NextRequest, { params }: Context) {
  const guard = await requireUser(request, { mutating: true, limit: { key: 'uploads', max: 120, windowMs: 60 * 60 * 1000 } })
  if (guard.response) return guard.response
  if (!isUuid(params.id)) return json({ error: 'not_found' }, 404)

  try {
    const db = audioDb()
    const userId = guard.session.userId
    const body = await readJson(request)

    const { data: row, error } = await db
      .from('audio_uploads')
      .select('id, storage_path, status, bytes')
      .eq('id', params.id)
      .eq('user_id', userId)
      .maybeSingle()
    if (error) throw error
    if (!row) return json({ error: 'not_found' }, 404)

    const discard = async (status: number, code: string, message: string) => {
      await db.storage.from(USER_AUDIO_BUCKET).remove([row.storage_path])
      await db.from('audio_uploads').delete().eq('id', row.id)
      return json({ error: code, message }, status)
    }

    if (row.status !== 'ready') {
      const size = await objectSize(USER_AUDIO_BUCKET, row.storage_path)
      if (size === null) {
        return json({ error: 'not_uploaded', message: 'The file has not arrived yet. Try the upload again.' }, 409)
      }

      const limits = audioLimits()
      if (size <= 0 || size > limits.max_upload_bytes) {
        return discard(413, 'too_large', 'That file is over the size limit per track.')
      }
      const usage = await uploadUsage(userId)
      if (usage.bytes - Number(row.bytes) + size > limits.max_total_upload_bytes) {
        return discard(409, 'quota_exceeded', 'That file would go over your upload space.')
      }

      const head = await readObjectHead(USER_AUDIO_BUCKET, row.storage_path, SNIFF_BYTES)
      if (!head) return json({ error: 'unavailable', message: 'Could not check the file. Try again.' }, 502)
      const format = sniffAudioFormat(head)
      if (!format || format !== audioExtension(row.storage_path)) {
        return discard(
          415,
          'unsupported_format',
          'That file is not the audio format its name says it is. Upload an MP3, OGG, WAV or FLAC file.'
        )
      }

      const measured = Number(body?.duration_seconds)
      const duration = Number.isFinite(measured) && measured > 0 && measured <= 24 * 3600 ? Math.round(measured * 1000) / 1000 : null
      const { error: updateError } = await db
        .from('audio_uploads')
        .update({ status: 'ready', bytes: size, duration_seconds: duration })
        .eq('id', row.id)
      if (updateError) throw updateError
    }

    const { data: ready, error: readyError } = await db.from('audio_uploads').select(UPLOAD_COLUMNS).eq('id', row.id).single()
    if (readyError) throw readyError
    return json({ ok: true, upload: uploadJson(ready, new Set()) })
  } catch (error: any) {
    console.error('Audio upload complete error:', error)
    return json({ error: 'server_error', message: 'Could not finish the upload.' }, 500)
  }
}
