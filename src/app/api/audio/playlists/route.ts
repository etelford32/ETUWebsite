import { NextRequest } from 'next/server'
import { audioLimits, PLAYLIST_COLORS } from '@/lib/audio/config'
import { audioDb, cleanText, json, PLAYLIST_COLUMNS, playlistJson, readJson, requireUser } from '@/lib/audio/server'

/**
 * POST /api/audio/playlists  { name, description?, color?, sync_to_game? }
 *
 * Create an empty station. Its tracks are set with
 * PUT /api/audio/playlists/[id].
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const guard = await requireUser(request, { mutating: true, limit: { key: 'playlists', max: 120, windowMs: 60 * 60 * 1000 } })
  if (guard.response) return guard.response

  const body = await readJson(request)
  const name = cleanText(body?.name, 40)
  if (!name) return json({ error: 'bad_request', message: 'Give the station a name.' }, 400)

  try {
    const db = audioDb()
    const userId = guard.session.userId
    const limits = audioLimits()

    const { count, error: countError } = await db
      .from('audio_playlists')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
    if (countError) throw countError
    if ((count ?? 0) >= limits.max_playlists) {
      return json(
        { error: 'limit_reached', message: `You can keep up to ${limits.max_playlists} stations. Delete one to make room.` },
        409
      )
    }

    const color = PLAYLIST_COLORS.includes(body?.color) ? body.color : PLAYLIST_COLORS[(count ?? 0) % PLAYLIST_COLORS.length]
    const { data, error } = await db
      .from('audio_playlists')
      .insert({
        user_id: userId,
        name,
        description: cleanText(body?.description, 200),
        color,
        sync_to_game: body?.sync_to_game !== false,
      })
      .select(PLAYLIST_COLUMNS)
      .single()
    if (error) throw error
    return json({ ok: true, playlist: playlistJson(data, []) }, 201)
  } catch (error: any) {
    console.error('Audio playlist create error:', error)
    return json({ error: 'server_error' }, 500)
  }
}
