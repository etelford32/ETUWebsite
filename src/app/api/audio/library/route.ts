import { NextRequest } from 'next/server'
import { getSessionFromRequest } from '@/lib/session'
import { audioLimits, RADIO_STATIONS, SFX_CATEGORY_LABELS, THEMES_GROUP } from '@/lib/audio/config'
import {
  audioDb,
  isMissingSchema,
  json,
  PLAYLIST_COLUMNS,
  playlistItems,
  playlistJson,
  TRACK_COLUMNS,
  trackJson,
  UPLOAD_COLUMNS,
  uploadJson,
  uploadUsage,
} from '@/lib/audio/server'

/**
 * GET /api/audio/library — everything /audio shows.
 *
 * Signed out: `{ authenticated: false, preview }`, where `preview` is the
 * soundtrack's track titles and how many sounds the library holds. No file
 * can be reached from it.
 *
 * Signed in: the game's published tracks, and the caller's own favourites,
 * stations and uploads. Files are fetched one at a time through
 * /api/audio/stream.
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const DIAL = {
  stations: RADIO_STATIONS,
  themes: THEMES_GROUP,
  sfx_labels: SFX_CATEGORY_LABELS,
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request)
    const db = audioDb()

    const { data: trackRows, error: trackError } = await db
      .from('audio_tracks')
      .select(TRACK_COLUMNS)
      .eq('status', 'published')
      .order('sort_order', { ascending: true })
      .order('title', { ascending: true })
    if (trackError) {
      if (isMissingSchema(trackError)) {
        return json({ authenticated: !!session, unavailable: true, dial: DIAL })
      }
      throw trackError
    }
    const tracks = trackRows ?? []

    if (!session) {
      return json({
        authenticated: false,
        dial: DIAL,
        preview: {
          music: tracks
            .filter((t: any) => t.kind === 'music')
            .map((t: any) => ({ title: t.title, category: t.category, duration_seconds: Number(t.duration_seconds) || null })),
          sfx_count: tracks.filter((t: any) => t.kind === 'sfx').length,
        },
      })
    }

    const userId = session.userId
    const [favorites, uploads, playlists, usage, profile] = await Promise.all([
      db.from('audio_favorites').select('track_id, upload_id').eq('user_id', userId),
      db
        .from('audio_uploads')
        .select(UPLOAD_COLUMNS)
        .eq('user_id', userId)
        .eq('status', 'ready')
        .order('created_at', { ascending: false }),
      db.from('audio_playlists').select(PLAYLIST_COLUMNS).eq('user_id', userId).order('created_at', { ascending: true }),
      uploadUsage(userId),
      db.from('profiles').select('steam_id').eq('id', userId).maybeSingle(),
    ])
    for (const result of [favorites, uploads, playlists]) {
      if (result.error) throw result.error
    }

    const starred = new Set<string>()
    for (const row of favorites.data ?? []) starred.add(row.track_id ?? row.upload_id)

    const uploadRows = uploads.data ?? []
    const playlistRows = playlists.data ?? []
    const items = await playlistItems(
      playlistRows.map((p: any) => p.id),
      {
        tracks: new Set(tracks.filter((t: any) => t.kind === 'music').map((t: any) => t.id)),
        uploads: new Set(uploadRows.map((u: any) => u.id)),
      }
    )

    return json({
      authenticated: true,
      dial: DIAL,
      tracks: tracks.map((t: any) => trackJson(t, starred)),
      uploads: uploadRows.map((u: any) => uploadJson(u, starred)),
      playlists: playlistRows.map((p: any) => playlistJson(p, items.get(p.id) ?? [])),
      limits: audioLimits(),
      usage: { uploads: usage.count, upload_bytes: usage.bytes },
      // The game signs in with Steam, so it finds these stations only on an
      // account that has a Steam ID.
      steam_linked: !!profile.data?.steam_id,
    })
  } catch (error: any) {
    console.error('Audio library error:', error)
    return json({ error: 'server_error', message: 'Could not load the audio library.' }, 500)
  }
}
