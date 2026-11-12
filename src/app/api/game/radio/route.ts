import { NextRequest, NextResponse } from 'next/server'
import { resolveGameCaller } from '@/lib/gameAuth'
import { checkRateLimit } from '@/lib/ratelimit'
import {
  audioExtension,
  GAME_AUDIO_BUCKET,
  GAME_URL_TTL_SECONDS,
  isRadioCategory,
  RADIO_STATIONS,
  USER_AUDIO_BUCKET,
} from '@/lib/audio/config'
import { audioDb, isMissingSchema, signedUrls } from '@/lib/audio/server'

/**
 * GET /api/game/radio — what the in-game Intergalactic Radio tunes for the
 * signed-in player (AUDIO-01, docs/GAME_API.md section 8).
 *
 * Auth: `Authorization: Bearer <access_token>` from /api/game/steam-session.
 *
 * Returns three things:
 *
 *   tracks    every track named below, by id, with a download URL that
 *             works for `urls_expire_in` seconds. A game track also carries
 *             the `repo_path` it has in the game's assets/audio, so the
 *             client plays its local copy when it has one and downloads
 *             only what the build doesn't ship.
 *   stations  the player's own: "Favorites" (when they have any) and each
 *             station they built on the website and left set to sync, in
 *             dial order.
 *   catalog   the game's published soundtrack by built-in station
 *             (EXPLORATION, COMBAT, STATION, BOSS), so stations the build
 *             ships empty fill from the website.
 *
 * Only music is listed; sound effects and menu-only themes never reach the
 * radio. Uploads are the caller's own and nobody else's.
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const NO_STORE = { 'Cache-Control': 'no-store' }

function fail(status: number, error: string, extra: Record<string, unknown> = {}) {
  return NextResponse.json({ ok: false, error, ...extra }, { status, headers: NO_STORE })
}

function rgb(hex: string): [number, number, number] {
  const n = Number.parseInt(hex.slice(1), 16)
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff]
}

function seconds(value: unknown): number | null {
  const n = Number(value)
  return value === null || value === undefined || !Number.isFinite(n) ? null : n
}

export async function GET(request: NextRequest) {
  const auth = await resolveGameCaller(request, null, {
    rateLimit: (subject) => checkRateLimit(`game-radio:${subject}`, 60, 60 * 60 * 1000),
  })
  if (!auth.ok) {
    const error = auth.error === 'unauthorized' ? 'not_authenticated' : auth.error
    return fail(auth.status, error, auth.retryAfter ? { retry_after: auth.retryAfter } : {})
  }
  const userId = auth.caller.userId

  try {
    const db = audioDb()
    const [music, uploads, favorites, playlists] = await Promise.all([
      db
        .from('audio_tracks')
        .select('id, category, title, mime_type, bytes, duration_seconds, storage_path, repo_path, git_sha, updated_at')
        .eq('status', 'published')
        .eq('kind', 'music')
        .order('sort_order', { ascending: true })
        .order('title', { ascending: true }),
      db
        .from('audio_uploads')
        .select('id, title, artist, mime_type, bytes, duration_seconds, storage_path')
        .eq('user_id', userId)
        .eq('status', 'ready'),
      db
        .from('audio_favorites')
        .select('track_id, upload_id, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: true }),
      db
        .from('audio_playlists')
        .select('id, name, description, color')
        .eq('user_id', userId)
        .eq('sync_to_game', true)
        .order('created_at', { ascending: true }),
    ])
    for (const result of [music, uploads, favorites, playlists]) {
      if (result.error) {
        if (isMissingSchema(result.error)) return fail(503, 'not_configured')
        throw result.error
      }
    }

    // Only what the radio may play: music on a built-in station, and the
    // player's own uploads.
    const gameTracks = new Map<string, any>()
    for (const t of music.data ?? []) if (isRadioCategory(t.category)) gameTracks.set(t.id, t)
    const ownUploads = new Map<string, any>()
    for (const u of uploads.data ?? []) ownUploads.set(u.id, u)
    const playable = (id: string | null) => !!id && (gameTracks.has(id) || ownUploads.has(id))

    const playlistRows = playlists.data ?? []
    const itemsByPlaylist = new Map<string, string[]>()
    if (playlistRows.length) {
      const { data: items, error } = await db
        .from('audio_playlist_items')
        .select('playlist_id, position, track_id, upload_id')
        .in('playlist_id', playlistRows.map((p: any) => p.id))
        .order('position', { ascending: true })
      if (error) throw error
      for (const item of items ?? []) {
        const id = item.track_id ?? item.upload_id
        if (!playable(id)) continue
        const list = itemsByPlaylist.get(item.playlist_id) ?? []
        list.push(id)
        itemsByPlaylist.set(item.playlist_id, list)
      }
    }

    const stations: any[] = []
    const favoriteIds = (favorites.data ?? []).map((f: any) => f.track_id ?? f.upload_id).filter(playable)
    if (favoriteIds.length) {
      stations.push({
        id: 'favorites',
        kind: 'favorites',
        name: 'Favorites',
        tab: 'FAVORITES',
        description: 'Tracks you starred on the website',
        color: rgb('#fbbf24'),
        track_ids: favoriteIds,
      })
    }
    for (const p of playlistRows) {
      const trackIds = itemsByPlaylist.get(p.id) ?? []
      if (!trackIds.length) continue
      stations.push({
        id: `playlist:${p.id}`,
        kind: 'playlist',
        name: p.name,
        tab: String(p.name).toUpperCase().slice(0, 14),
        description: p.description ?? 'Your station',
        color: rgb(p.color),
        track_ids: trackIds,
      })
    }

    const catalog = RADIO_STATIONS.map((station) => ({
      station_id: station.id,
      name: station.name,
      states: station.categories.map((c) => c.toUpperCase()),
      track_ids: station.categories.flatMap((category) =>
        Array.from(gameTracks.values())
          .filter((t) => t.category === category)
          .map((t) => t.id as string)
      ),
    }))

    // Sign each referenced file once.
    const used = new Set<string>([...stations.flatMap((s) => s.track_ids), ...catalog.flatMap((c) => c.track_ids)])
    const gamePaths: string[] = []
    const userPaths: string[] = []
    for (const id of used) {
      if (gameTracks.has(id)) gamePaths.push(gameTracks.get(id).storage_path)
      else userPaths.push(ownUploads.get(id).storage_path)
    }
    const [gameUrls, userUrls] = await Promise.all([
      signedUrls(GAME_AUDIO_BUCKET, gamePaths, GAME_URL_TTL_SECONDS),
      signedUrls(USER_AUDIO_BUCKET, userPaths, GAME_URL_TTL_SECONDS),
    ])

    const tracks: Record<string, unknown> = {}
    for (const id of used) {
      const game = gameTracks.get(id)
      if (game) {
        const url = gameUrls.get(game.storage_path)
        if (!url) continue
        tracks[id] = {
          id,
          source: 'game',
          title: game.title,
          artist: null,
          category: game.category,
          state: String(game.category).toUpperCase(),
          repo_path: game.repo_path ?? null,
          version: game.git_sha ?? game.updated_at,
          ext: audioExtension(game.storage_path),
          mime_type: game.mime_type,
          bytes: Number(game.bytes),
          duration_seconds: seconds(game.duration_seconds),
          url,
        }
        continue
      }
      const upload = ownUploads.get(id)
      const url = userUrls.get(upload.storage_path)
      if (!url) continue
      tracks[id] = {
        id,
        source: 'upload',
        title: upload.title,
        artist: upload.artist ?? null,
        category: null,
        state: null,
        repo_path: null,
        // An upload's bytes never change: a new file is a new id.
        version: id,
        ext: audioExtension(upload.storage_path),
        mime_type: upload.mime_type,
        bytes: Number(upload.bytes),
        duration_seconds: seconds(upload.duration_seconds),
        url,
      }
    }

    // A track whose URL could not be signed is dropped from every list, so
    // the client never sees an id it can't resolve.
    const resolvable = (ids: string[]) => ids.filter((id) => id in tracks)
    return NextResponse.json(
      {
        ok: true,
        generated_at: new Date().toISOString(),
        urls_expire_in: GAME_URL_TTL_SECONDS,
        tracks,
        stations: stations
          .map((s) => ({ ...s, track_ids: resolvable(s.track_ids) }))
          .filter((s) => s.track_ids.length),
        catalog: catalog.map((c) => ({ ...c, track_ids: resolvable(c.track_ids) })),
      },
      { headers: NO_STORE }
    )
  } catch (error: any) {
    console.error('Game radio error:', error)
    return fail(500, 'server_error')
  }
}
