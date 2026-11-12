import { NextRequest } from 'next/server'
import { audioLimits, PLAYLIST_COLORS } from '@/lib/audio/config'
import {
  audioDb,
  cleanText,
  isUuid,
  json,
  LibraryItemRef,
  PLAYLIST_COLUMNS,
  playlistJson,
  readJson,
  requireUser,
} from '@/lib/audio/server'

/**
 * PUT    /api/audio/playlists/[id]  { name?, description?, color?, sync_to_game?, items? }
 * DELETE /api/audio/playlists/[id]
 *
 * PUT saves a station. `items`, when present, is the station's whole track
 * list in play order: [{ type: 'track' | 'upload', id }]. The database keeps
 * only what the owner may list (published music, their own ready uploads,
 * each once) and the response carries the list as stored.
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const LIMIT = { key: 'playlists', max: 600, windowMs: 60 * 60 * 1000 }

type Context = { params: { id: string } }

export async function PUT(request: NextRequest, { params }: Context) {
  const guard = await requireUser(request, { mutating: true, limit: LIMIT })
  if (guard.response) return guard.response
  if (!isUuid(params.id)) return json({ error: 'not_found' }, 404)

  const body = await readJson(request)
  if (!body) return json({ error: 'bad_request' }, 400)

  const patch: Record<string, unknown> = {}
  if ('name' in body) {
    const name = cleanText(body.name, 40)
    if (!name) return json({ error: 'bad_request', message: 'Give the station a name.' }, 400)
    patch.name = name
  }
  if ('description' in body) patch.description = cleanText(body.description, 200)
  if ('color' in body) {
    if (!PLAYLIST_COLORS.includes(body.color)) return json({ error: 'bad_request' }, 400)
    patch.color = body.color
  }
  if ('sync_to_game' in body) patch.sync_to_game = body.sync_to_game === true

  let items: Record<string, string>[] | null = null
  if ('items' in body) {
    if (!Array.isArray(body.items) || body.items.length > 500) return json({ error: 'bad_request' }, 400)
    items = []
    for (const item of body.items) {
      if (!isUuid(item?.id)) continue
      if (item.type === 'track') items.push({ track_id: item.id })
      else if (item.type === 'upload') items.push({ upload_id: item.id })
    }
  }

  try {
    const db = audioDb()
    const userId = guard.session.userId

    const { data: owned, error: ownedError } = await db
      .from('audio_playlists')
      .select('id')
      .eq('id', params.id)
      .eq('user_id', userId)
      .maybeSingle()
    if (ownedError) throw ownedError
    if (!owned) return json({ error: 'not_found' }, 404)

    if (Object.keys(patch).length) {
      const { error } = await db.from('audio_playlists').update(patch).eq('id', params.id).eq('user_id', userId)
      if (error) throw error
    }
    if (items) {
      const { error } = await db.rpc('audio_replace_playlist_items', {
        p_playlist: params.id,
        p_user: userId,
        p_items: items,
        p_max: audioLimits().max_playlist_items,
      })
      if (error) throw error
    }

    const [{ data: row, error: rowError }, { data: stored, error: itemsError }] = await Promise.all([
      db.from('audio_playlists').select(PLAYLIST_COLUMNS).eq('id', params.id).single(),
      db
        .from('audio_playlist_items')
        .select('track_id, upload_id')
        .eq('playlist_id', params.id)
        .order('position', { ascending: true }),
    ])
    if (rowError) throw rowError
    if (itemsError) throw itemsError
    const refs: LibraryItemRef[] = (stored ?? []).map((r: any) =>
      r.track_id ? { type: 'track', id: r.track_id } : { type: 'upload', id: r.upload_id }
    )
    return json({ ok: true, playlist: playlistJson(row, refs) })
  } catch (error: any) {
    console.error('Audio playlist save error:', error)
    return json({ error: 'server_error' }, 500)
  }
}

export async function DELETE(request: NextRequest, { params }: Context) {
  const guard = await requireUser(request, { mutating: true, limit: LIMIT })
  if (guard.response) return guard.response
  if (!isUuid(params.id)) return json({ error: 'not_found' }, 404)

  try {
    const { data, error } = await audioDb()
      .from('audio_playlists')
      .delete()
      .eq('id', params.id)
      .eq('user_id', guard.session.userId)
      .select('id')
    if (error) throw error
    if (!data?.length) return json({ error: 'not_found' }, 404)
    return json({ ok: true })
  } catch (error: any) {
    console.error('Audio playlist delete error:', error)
    return json({ error: 'server_error' }, 500)
  }
}
