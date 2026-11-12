import { randomUUID } from 'crypto'
import { NextRequest } from 'next/server'
import { AUDIO_FORMATS, audioExtension, audioLimits, USER_AUDIO_BUCKET } from '@/lib/audio/config'
import { titleFromStem } from '@/lib/audio/catalog'
import { audioDb, cleanText, clearStaleUploads, json, readJson, requireUser, uploadUsage } from '@/lib/audio/server'

/**
 * POST /api/audio/uploads  { filename, size, title?, artist? }
 *
 * Step 1 of adding your own music. The file itself never passes through
 * this server: the response carries a one-time URL the browser PUTs the
 * file to, straight into private storage. Step 2 is
 * POST /api/audio/uploads/[id]/complete, which checks what arrived.
 *
 * Refused here: a format the game can't play, a file over the size limit,
 * and anything that would take the account over its track or storage quota.
 * The bucket enforces the size and type again on the upload itself.
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function megabytes(bytes: number): string {
  return `${Math.round(bytes / (1024 * 1024))} MB`
}

export async function POST(request: NextRequest) {
  const guard = await requireUser(request, { mutating: true, limit: { key: 'uploads', max: 60, windowMs: 60 * 60 * 1000 } })
  if (guard.response) return guard.response

  const limits = audioLimits()
  if (!limits.uploads_enabled) {
    return json({ error: 'uploads_disabled', message: 'Uploads are switched off at the moment.' }, 403)
  }

  const body = await readJson(request)
  const filename = cleanText(body?.filename, 255)
  const size = Number(body?.size)
  const ext = filename ? audioExtension(filename) : null
  if (!filename || !ext) {
    return json({ error: 'unsupported_format', message: 'Upload an MP3, OGG, WAV or FLAC file.' }, 400)
  }
  if (!Number.isInteger(size) || size <= 0) return json({ error: 'bad_request' }, 400)
  if (size > limits.max_upload_bytes) {
    return json(
      { error: 'too_large', message: `That file is over the ${megabytes(limits.max_upload_bytes)} limit per track.` },
      413
    )
  }

  try {
    const db = audioDb()
    const userId = guard.session.userId

    await clearStaleUploads(userId)
    const usage = await uploadUsage(userId)
    if (usage.count >= limits.max_uploads) {
      return json(
        { error: 'limit_reached', message: `You can keep up to ${limits.max_uploads} uploads. Delete one to make room.` },
        409
      )
    }
    if (usage.bytes + size > limits.max_total_upload_bytes) {
      return json(
        {
          error: 'quota_exceeded',
          message: `That would go over your ${megabytes(limits.max_total_upload_bytes)} of upload space.`,
        },
        409
      )
    }

    const id = randomUUID()
    const storagePath = `${userId}/${id}.${ext}`
    const stem = filename.replace(/\.[A-Za-z0-9]+$/, '')
    const { error: insertError } = await db.from('audio_uploads').insert({
      id,
      user_id: userId,
      title: cleanText(body?.title, 120) ?? titleFromStem(stem),
      artist: cleanText(body?.artist, 120),
      original_filename: filename,
      storage_path: storagePath,
      mime_type: AUDIO_FORMATS[ext],
      bytes: size,
      status: 'pending',
    })
    if (insertError) throw insertError

    const { data: signed, error: signError } = await db.storage.from(USER_AUDIO_BUCKET).createSignedUploadUrl(storagePath)
    if (signError || !signed?.signedUrl) {
      await db.from('audio_uploads').delete().eq('id', id)
      throw signError ?? new Error('no signed upload url')
    }

    return json(
      {
        ok: true,
        upload_id: id,
        upload_url: signed.signedUrl,
        // The browser must send exactly this type: the bucket only accepts audio.
        content_type: AUDIO_FORMATS[ext],
      },
      201
    )
  } catch (error: any) {
    console.error('Audio upload request error:', error)
    return json({ error: 'server_error', message: 'Could not start the upload.' }, 500)
  }
}
