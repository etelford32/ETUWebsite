import { NextRequest } from 'next/server'
import { audioDb, isUuid, json, readJson, requireUser } from '@/lib/audio/server'

/**
 * POST   /api/audio/favorites  { type: 'track' | 'upload', id }  — star it
 * DELETE /api/audio/favorites  { type, id }                      — unstar it
 *
 * Both are idempotent. A game track must be published; an upload must be
 * the caller's own.
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const LIMIT = { key: 'favorites', max: 600, windowMs: 60 * 60 * 1000 }

async function target(request: NextRequest): Promise<{ column: 'track_id' | 'upload_id'; id: string } | null> {
  const body = await readJson(request)
  if (!body || !isUuid(body.id)) return null
  if (body.type === 'track') return { column: 'track_id', id: body.id }
  if (body.type === 'upload') return { column: 'upload_id', id: body.id }
  return null
}

export async function POST(request: NextRequest) {
  const guard = await requireUser(request, { mutating: true, limit: LIMIT })
  if (guard.response) return guard.response
  const t = await target(request)
  if (!t) return json({ error: 'bad_request' }, 400)

  try {
    const db = audioDb()
    const userId = guard.session.userId
    const owned =
      t.column === 'track_id'
        ? await db.from('audio_tracks').select('id').eq('id', t.id).eq('status', 'published').maybeSingle()
        : await db.from('audio_uploads').select('id').eq('id', t.id).eq('user_id', userId).eq('status', 'ready').maybeSingle()
    if (owned.error) throw owned.error
    if (!owned.data) return json({ error: 'not_found' }, 404)

    const { error } = await db.from('audio_favorites').insert({ user_id: userId, [t.column]: t.id })
    // 23505: already starred, which is what was asked for.
    if (error && error.code !== '23505') throw error
    return json({ ok: true, favorite: true })
  } catch (error: any) {
    console.error('Audio favourite error:', error)
    return json({ error: 'server_error' }, 500)
  }
}

export async function DELETE(request: NextRequest) {
  const guard = await requireUser(request, { mutating: true, limit: LIMIT })
  if (guard.response) return guard.response
  const t = await target(request)
  if (!t) return json({ error: 'bad_request' }, 400)

  try {
    const { error } = await audioDb()
      .from('audio_favorites')
      .delete()
      .eq('user_id', guard.session.userId)
      .eq(t.column, t.id)
    if (error) throw error
    return json({ ok: true, favorite: false })
  } catch (error: any) {
    console.error('Audio favourite error:', error)
    return json({ error: 'server_error' }, 500)
  }
}
