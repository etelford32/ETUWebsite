import { randomUUID } from 'crypto'
import { NextRequest } from 'next/server'
import { AUDIO_FORMATS, audioExtension, GAME_AUDIO_BUCKET, MAX_CATALOG_UPLOAD_BYTES } from '@/lib/audio/config'
import { titleFromStem } from '@/lib/audio/catalog'
import { getGameRepoConfig } from '@/lib/audio/gameRepo'
import { audioDb, cleanText, isMissingSchema, json, readJson, requireAdmin } from '@/lib/audio/server'

/**
 * GET  /api/admin/audio — the whole catalogue, hidden and removed included,
 *                         and whether the repository sync is configured.
 * POST /api/admin/audio — { filename, size, kind, category, title? }
 *                         start an admin upload of a track the game
 *                         repository doesn't carry (a soundtrack master, say).
 *                         Returns a one-time URL to PUT the file to; the
 *                         track stays hidden until PATCH [id] { finalize }.
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ADMIN_TRACK_COLUMNS =
  'id, source, repo_path, kind, category, title, description, mime_type, bytes, duration_seconds, status, sort_order, updated_at'

export async function GET(request: NextRequest) {
  const guard = await requireAdmin(request)
  if (guard.response) return guard.response

  const config = getGameRepoConfig()
  const repo = config ? { configured: true, repo: config.repo, branch: config.branch, path: config.audioPath } : { configured: false }

  try {
    const db = audioDb()
    const { data, error } = await db
      .from('audio_tracks')
      .select(ADMIN_TRACK_COLUMNS)
      .order('kind', { ascending: true })
      .order('category', { ascending: true })
      .order('sort_order', { ascending: true })
      .order('title', { ascending: true })
    if (error) {
      if (isMissingSchema(error)) return json({ migrated: false, repo, tracks: [] })
      throw error
    }
    const [uploads, playlists] = await Promise.all([
      db.from('audio_uploads').select('bytes').eq('status', 'ready'),
      db.from('audio_playlists').select('id', { count: 'exact', head: true }),
    ])
    const uploadRows = uploads.data ?? []
    return json({
      migrated: true,
      repo,
      tracks: (data ?? []).map((t: any) => ({ ...t, bytes: Number(t.bytes), duration_seconds: t.duration_seconds === null ? null : Number(t.duration_seconds) })),
      players: {
        uploads: uploadRows.length,
        upload_bytes: uploadRows.reduce((sum: number, r: any) => sum + Number(r.bytes ?? 0), 0),
        playlists: playlists.count ?? 0,
      },
    })
  } catch (error: any) {
    console.error('Admin audio list error:', error)
    return json({ error: 'server_error' }, 500)
  }
}

export async function POST(request: NextRequest) {
  const guard = await requireAdmin(request, { mutating: true })
  if (guard.response) return guard.response

  const body = await readJson(request)
  const filename = cleanText(body?.filename, 255)
  const ext = filename ? audioExtension(filename) : null
  const size = Number(body?.size)
  const kind = body?.kind === 'sfx' ? 'sfx' : body?.kind === 'music' ? 'music' : null
  const category = typeof body?.category === 'string' && /^[a-z0-9_]{1,40}$/.test(body.category) ? body.category : null
  if (!filename || !ext) return json({ error: 'unsupported_format', message: 'Upload an OGG, MP3, WAV or FLAC file.' }, 400)
  if (!kind || !category || !Number.isInteger(size) || size <= 0) return json({ error: 'bad_request' }, 400)
  if (size > MAX_CATALOG_UPLOAD_BYTES) {
    return json({ error: 'too_large', message: 'Files over 50 MB can’t be stored; convert the master to OGG.' }, 413)
  }

  try {
    const db = audioDb()
    const id = randomUUID()
    const storagePath = `website/${id}.${ext}`
    const { error: insertError } = await db.from('audio_tracks').insert({
      id,
      source: 'website',
      storage_path: storagePath,
      kind,
      category,
      title: cleanText(body?.title, 120) ?? titleFromStem(filename.replace(/\.[A-Za-z0-9]+$/, '')),
      description: cleanText(body?.description, 500),
      mime_type: AUDIO_FORMATS[ext],
      bytes: size,
      status: 'hidden',
    })
    if (insertError) throw insertError

    const { data: signed, error: signError } = await db.storage.from(GAME_AUDIO_BUCKET).createSignedUploadUrl(storagePath)
    if (signError || !signed?.signedUrl) {
      await db.from('audio_tracks').delete().eq('id', id)
      throw signError ?? new Error('no signed upload url')
    }
    return json({ ok: true, track_id: id, upload_url: signed.signedUrl, content_type: AUDIO_FORMATS[ext] }, 201)
  } catch (error: any) {
    console.error('Admin audio upload error:', error)
    return json({ error: 'server_error', message: 'Could not start the upload.' }, 500)
  }
}
