import { NextRequest } from 'next/server'
import { USER_AUDIO_BUCKET } from '@/lib/audio/config'
import { audioDb, cleanText, isUuid, json, readJson, requireUser, UPLOAD_COLUMNS, uploadJson } from '@/lib/audio/server'

/**
 * PATCH  /api/audio/uploads/[id]  { title?, artist? }  — rename
 * DELETE /api/audio/uploads/[id]                       — delete the file
 *
 * Deleting also takes the track off the owner's stations and favourites
 * (foreign keys cascade). It is also how an upload that never finished is
 * abandoned.
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const LIMIT = { key: 'uploads-edit', max: 300, windowMs: 60 * 60 * 1000 }

type Context = { params: { id: string } }

export async function PATCH(request: NextRequest, { params }: Context) {
  const guard = await requireUser(request, { mutating: true, limit: LIMIT })
  if (guard.response) return guard.response
  if (!isUuid(params.id)) return json({ error: 'not_found' }, 404)

  const body = await readJson(request)
  const patch: Record<string, unknown> = {}
  if (body && 'title' in body) {
    const title = cleanText(body.title, 120)
    if (!title) return json({ error: 'bad_request', message: 'A track needs a title.' }, 400)
    patch.title = title
  }
  if (body && 'artist' in body) patch.artist = cleanText(body.artist, 120)
  if (!Object.keys(patch).length) return json({ error: 'bad_request' }, 400)

  try {
    const { data, error } = await audioDb()
      .from('audio_uploads')
      .update(patch)
      .eq('id', params.id)
      .eq('user_id', guard.session.userId)
      .eq('status', 'ready')
      .select(UPLOAD_COLUMNS)
    if (error) throw error
    if (!data?.length) return json({ error: 'not_found' }, 404)
    return json({ ok: true, upload: uploadJson(data[0], new Set()) })
  } catch (error: any) {
    console.error('Audio upload rename error:', error)
    return json({ error: 'server_error' }, 500)
  }
}

export async function DELETE(request: NextRequest, { params }: Context) {
  const guard = await requireUser(request, { mutating: true, limit: LIMIT })
  if (guard.response) return guard.response
  if (!isUuid(params.id)) return json({ error: 'not_found' }, 404)

  try {
    const db = audioDb()
    const { data: row, error } = await db
      .from('audio_uploads')
      .select('id, storage_path')
      .eq('id', params.id)
      .eq('user_id', guard.session.userId)
      .maybeSingle()
    if (error) throw error
    if (!row) return json({ error: 'not_found' }, 404)

    // File first: a row without a file is harmless, a file without a row is
    // storage nobody can see or free.
    const { error: removeError } = await db.storage.from(USER_AUDIO_BUCKET).remove([row.storage_path])
    if (removeError) throw removeError
    const { error: deleteError } = await db.from('audio_uploads').delete().eq('id', row.id)
    if (deleteError) throw deleteError
    return json({ ok: true })
  } catch (error: any) {
    console.error('Audio upload delete error:', error)
    return json({ error: 'server_error' }, 500)
  }
}
