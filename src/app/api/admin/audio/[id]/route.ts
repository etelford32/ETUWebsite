import { NextRequest } from 'next/server'
import { audioExtension, GAME_AUDIO_BUCKET } from '@/lib/audio/config'
import { SNIFF_BYTES, sniffAudioFormat } from '@/lib/audio/inspect'
import { audioDb, cleanText, isUuid, json, objectSize, readJson, readObjectHead, requireAdmin } from '@/lib/audio/server'

/**
 * PATCH  /api/admin/audio/[id]  { title?, description?, status?, category?, sort_order?,
 *                                 finalize?, duration_seconds? }
 * DELETE /api/admin/audio/[id]
 *
 * PATCH edits how a track is listed. `status` is 'published' or 'hidden'
 * ('removed' belongs to the repository sync). `finalize: true` completes an
 * admin upload: the stored file is checked and the track is published.
 *
 * DELETE is for tracks uploaded on the website. A repository track is
 * removed by deleting its file from the game repository and syncing; here
 * it can only be hidden, or it would come straight back.
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const COLUMNS =
  'id, source, repo_path, kind, category, title, description, mime_type, bytes, duration_seconds, status, sort_order, updated_at, storage_path'

type Context = { params: { id: string } }

function listed(row: any) {
  const { storage_path: _path, ...rest } = row
  return { ...rest, bytes: Number(row.bytes), duration_seconds: row.duration_seconds === null ? null : Number(row.duration_seconds) }
}

export async function PATCH(request: NextRequest, { params }: Context) {
  const guard = await requireAdmin(request, { mutating: true })
  if (guard.response) return guard.response
  if (!isUuid(params.id)) return json({ error: 'not_found' }, 404)
  const body = await readJson(request)
  if (!body) return json({ error: 'bad_request' }, 400)

  try {
    const db = audioDb()
    const { data: row, error } = await db.from('audio_tracks').select(COLUMNS).eq('id', params.id).maybeSingle()
    if (error) throw error
    if (!row) return json({ error: 'not_found' }, 404)

    const patch: Record<string, unknown> = {}
    if ('title' in body) {
      const title = cleanText(body.title, 120)
      if (!title) return json({ error: 'bad_request', message: 'A track needs a title.' }, 400)
      patch.title = title
    }
    if ('description' in body) patch.description = cleanText(body.description, 500)
    if ('category' in body) {
      if (typeof body.category !== 'string' || !/^[a-z0-9_]{1,40}$/.test(body.category)) {
        return json({ error: 'bad_request', message: 'A category is lower-case letters, digits and underscores.' }, 400)
      }
      patch.category = body.category
    }
    if ('sort_order' in body) {
      const order = Number(body.sort_order)
      if (!Number.isInteger(order) || Math.abs(order) > 100000) return json({ error: 'bad_request' }, 400)
      patch.sort_order = order
    }
    if ('status' in body) {
      if (body.status !== 'published' && body.status !== 'hidden') return json({ error: 'bad_request' }, 400)
      if (row.status === 'removed') {
        return json({ error: 'removed', message: 'This file is no longer in the game repository.' }, 409)
      }
      patch.status = body.status
    }

    if (body.finalize === true) {
      if (row.source !== 'website') return json({ error: 'bad_request' }, 400)
      const size = await objectSize(GAME_AUDIO_BUCKET, row.storage_path)
      if (size === null) return json({ error: 'not_uploaded', message: 'The file has not arrived yet.' }, 409)
      const head = await readObjectHead(GAME_AUDIO_BUCKET, row.storage_path, SNIFF_BYTES)
      if (!head) return json({ error: 'unavailable', message: 'Could not check the file. Try again.' }, 502)
      if (sniffAudioFormat(head) !== audioExtension(row.storage_path)) {
        await db.storage.from(GAME_AUDIO_BUCKET).remove([row.storage_path])
        await db.from('audio_tracks').delete().eq('id', row.id)
        return json({ error: 'unsupported_format', message: 'That file is not the audio format its name says it is.' }, 415)
      }
      const measured = Number(body.duration_seconds)
      patch.bytes = size
      patch.duration_seconds =
        Number.isFinite(measured) && measured > 0 && measured <= 24 * 3600 ? Math.round(measured * 1000) / 1000 : null
      patch.status = 'published'
    }

    if (!Object.keys(patch).length) return json({ error: 'bad_request' }, 400)
    const { data: updated, error: updateError } = await db
      .from('audio_tracks')
      .update(patch)
      .eq('id', row.id)
      .select(COLUMNS)
      .single()
    if (updateError) throw updateError
    return json({ ok: true, track: listed(updated) })
  } catch (error: any) {
    console.error('Admin audio edit error:', error)
    return json({ error: 'server_error' }, 500)
  }
}

export async function DELETE(request: NextRequest, { params }: Context) {
  const guard = await requireAdmin(request, { mutating: true })
  if (guard.response) return guard.response
  if (!isUuid(params.id)) return json({ error: 'not_found' }, 404)

  try {
    const db = audioDb()
    const { data: row, error } = await db
      .from('audio_tracks')
      .select('id, source, status, storage_path')
      .eq('id', params.id)
      .maybeSingle()
    if (error) throw error
    if (!row) return json({ error: 'not_found' }, 404)
    if (row.source === 'repo' && row.status !== 'removed') {
      return json(
        { error: 'repo_track', message: 'Hide this track, or delete its file from the game repository and sync.' },
        409
      )
    }
    const { error: removeError } = await db.storage.from(GAME_AUDIO_BUCKET).remove([row.storage_path])
    if (removeError) throw removeError
    const { error: deleteError } = await db.from('audio_tracks').delete().eq('id', row.id)
    if (deleteError) throw deleteError
    return json({ ok: true })
  } catch (error: any) {
    console.error('Admin audio delete error:', error)
    return json({ error: 'server_error' }, 500)
  }
}
