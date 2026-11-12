/**
 * AUDIO-01: server-side helpers shared by the /api/audio, /api/admin/audio
 * and /api/game/radio routes. Service role; never import from a client
 * component.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabaseServer'
import { getSessionFromRequest, SessionData } from '@/lib/session'
import { validateCSRFFromRequest } from '@/lib/csrf'
import { isAdmin } from '@/lib/adminAuth'
import { checkRateLimit } from '@/lib/ratelimit'
import { GAME_AUDIO_BUCKET, USER_AUDIO_BUCKET, UUID_PATTERN } from './config'

/** The service-role client, untyped: the audio tables postdate lib/types. */
export function audioDb(): any {
  return createServerClient() as any
}

export function json(body: unknown, status = 200, headers?: Record<string, string>): NextResponse {
  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store', ...headers } })
}

/**
 * True when the error says the AUDIO-01 migration has not been applied
 * (Postgres 42P01, or PostgREST's "not in the schema cache" codes).
 */
export function isMissingSchema(error: any): boolean {
  const code = String(error?.code ?? '')
  return code === '42P01' || code === 'PGRST205' || code === 'PGRST202'
}

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_PATTERN.test(value)
}

type Guard = { session: SessionData; response?: undefined } | { session?: undefined; response: NextResponse }

/**
 * The signed-in caller of a website route. `mutating` also checks the CSRF
 * header; `limit` rate-limits per account.
 */
export async function requireUser(
  request: NextRequest,
  options: { mutating?: boolean; limit?: { key: string; max: number; windowMs: number } } = {}
): Promise<Guard> {
  const session = await getSessionFromRequest(request)
  if (!session) return { response: json({ error: 'not_authenticated', message: 'Sign in to use the audio library.' }, 401) }
  if (options.mutating && !(await validateCSRFFromRequest(request))) {
    return { response: json({ error: 'invalid_csrf', message: 'Your session expired. Reload the page and try again.' }, 403) }
  }
  if (options.limit) {
    const result = checkRateLimit(`audio:${options.limit.key}:${session.userId}`, options.limit.max, options.limit.windowMs)
    if (!result.allowed) {
      return {
        response: json(
          { error: 'rate_limited', message: 'Too many requests. Try again shortly.', retry_after: result.retryAfter },
          429,
          { 'Retry-After': String(result.retryAfter ?? 60) }
        ),
      }
    }
  }
  return { session }
}

export async function requireAdmin(request: NextRequest, options: { mutating?: boolean } = {}): Promise<Guard> {
  const guard = await requireUser(request, options)
  if (guard.response) return guard
  if (!(await isAdmin(guard.session.userId))) return { response: json({ error: 'forbidden' }, 403) }
  return guard
}

export async function readJson(request: NextRequest): Promise<any | null> {
  try {
    const body = await request.json()
    return body && typeof body === 'object' ? body : null
  } catch {
    return null
  }
}

/** Trimmed text of at most `max` characters, or null when empty / not text. */
export function cleanText(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null
  // Control characters have no place in a title and break terminal logs.
  const text = value.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim()
  return text ? text.slice(0, max) : null
}

export async function signedUrl(bucket: string, path: string, ttlSeconds: number): Promise<string | null> {
  const { data, error } = await audioDb().storage.from(bucket).createSignedUrl(path, ttlSeconds)
  if (error || !data?.signedUrl) {
    console.error(`Audio: could not sign ${bucket}/${path}:`, error?.message)
    return null
  }
  return data.signedUrl
}

/** Signed URLs for many objects of one bucket: path -> url (missing ones omitted). */
export async function signedUrls(bucket: string, paths: string[], ttlSeconds: number): Promise<Map<string, string>> {
  const out = new Map<string, string>()
  const unique = Array.from(new Set(paths))
  for (let i = 0; i < unique.length; i += 100) {
    const batch = unique.slice(i, i + 100)
    const { data, error } = await audioDb().storage.from(bucket).createSignedUrls(batch, ttlSeconds)
    if (error) {
      console.error(`Audio: could not sign ${batch.length} objects in ${bucket}:`, error.message)
      continue
    }
    for (const row of data ?? []) {
      if (row?.signedUrl && row.path) out.set(row.path, row.signedUrl)
    }
  }
  return out
}

// ── the library, as /audio shows it ──────────────────────────────────────

export const TRACK_COLUMNS = 'id, kind, category, title, description, mime_type, bytes, duration_seconds, sort_order'
export const UPLOAD_COLUMNS = 'id, title, artist, mime_type, bytes, duration_seconds, created_at'

export interface LibraryItemRef {
  type: 'track' | 'upload'
  id: string
}

function seconds(value: unknown): number | null {
  const n = Number(value)
  return value === null || value === undefined || !Number.isFinite(n) ? null : n
}

export function trackJson(row: any, favorites: Set<string>) {
  return {
    id: row.id as string,
    kind: row.kind as 'music' | 'sfx',
    category: row.category as string,
    title: row.title as string,
    description: (row.description as string | null) ?? null,
    mime_type: row.mime_type as string,
    bytes: Number(row.bytes),
    duration_seconds: seconds(row.duration_seconds),
    favorite: favorites.has(row.id),
  }
}

export function uploadJson(row: any, favorites: Set<string>) {
  return {
    id: row.id as string,
    title: row.title as string,
    artist: (row.artist as string | null) ?? null,
    mime_type: row.mime_type as string,
    bytes: Number(row.bytes),
    duration_seconds: seconds(row.duration_seconds),
    created_at: row.created_at as string,
    favorite: favorites.has(row.id),
  }
}

export function playlistJson(row: any, items: LibraryItemRef[]) {
  return {
    id: row.id as string,
    name: row.name as string,
    description: (row.description as string | null) ?? null,
    color: row.color as string,
    sync_to_game: row.sync_to_game === true,
    updated_at: row.updated_at as string,
    items,
  }
}

export const PLAYLIST_COLUMNS = 'id, name, description, color, sync_to_game, updated_at'

/** A station's items in order, keeping only what `allowed` still lists. */
export async function playlistItems(
  playlistIds: string[],
  allowed: { tracks: Set<string>; uploads: Set<string> }
): Promise<Map<string, LibraryItemRef[]>> {
  const out = new Map<string, LibraryItemRef[]>()
  if (!playlistIds.length) return out
  const { data, error } = await audioDb()
    .from('audio_playlist_items')
    .select('playlist_id, position, track_id, upload_id')
    .in('playlist_id', playlistIds)
    .order('position', { ascending: true })
  if (error) throw error
  for (const row of data ?? []) {
    const ref: LibraryItemRef | null = row.track_id
      ? allowed.tracks.has(row.track_id)
        ? { type: 'track', id: row.track_id }
        : null
      : row.upload_id && allowed.uploads.has(row.upload_id)
        ? { type: 'upload', id: row.upload_id }
        : null
    if (!ref) continue
    const list = out.get(row.playlist_id) ?? []
    list.push(ref)
    out.set(row.playlist_id, list)
  }
  return out
}

export interface UploadUsage {
  count: number
  bytes: number
}

/** What the account's uploads add up to, pending ones included. */
export async function uploadUsage(userId: string): Promise<UploadUsage> {
  const { data, error } = await audioDb().from('audio_uploads').select('bytes').eq('user_id', userId)
  if (error) throw error
  const rows = data ?? []
  return { count: rows.length, bytes: rows.reduce((sum: number, r: any) => sum + Number(r.bytes ?? 0), 0) }
}

/**
 * Drop upload slots that were issued but never confirmed. A pending row
 * holds quota, so one abandoned an hour ago is cleared before the next
 * upload is sized up.
 */
export async function clearStaleUploads(userId: string): Promise<void> {
  const cutoff = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const db = audioDb()
  const { data } = await db
    .from('audio_uploads')
    .select('id, storage_path')
    .eq('user_id', userId)
    .eq('status', 'pending')
    .lt('created_at', cutoff)
  if (!data?.length) return
  await db.storage.from(USER_AUDIO_BUCKET).remove(data.map((r: any) => r.storage_path))
  await db.from('audio_uploads').delete().in('id', data.map((r: any) => r.id))
}

/** The first `length` bytes of a stored object, or null if it isn't there. */
export async function readObjectHead(bucket: string, path: string, length: number): Promise<Uint8Array | null> {
  const url = await signedUrl(bucket, path, 60)
  if (!url) return null
  try {
    const response = await fetch(url, { headers: { Range: `bytes=0-${length - 1}` }, cache: 'no-store' })
    if (!response.ok || !response.body) return null
    // Read only what was asked for, even if the server ignored the range.
    const reader = response.body.getReader()
    const chunks: Uint8Array[] = []
    let total = 0
    while (total < length) {
      const { done, value } = await reader.read()
      if (done || !value) break
      chunks.push(value)
      total += value.length
    }
    reader.cancel().catch(() => {})
    const out = new Uint8Array(Math.min(total, length))
    let offset = 0
    for (const chunk of chunks) {
      const part = chunk.subarray(0, Math.min(chunk.length, out.length - offset))
      out.set(part, offset)
      offset += part.length
      if (offset >= out.length) break
    }
    return out
  } catch {
    return null
  }
}

/** The stored size of an object in bytes, or null if it isn't there. */
export async function objectSize(bucket: string, path: string): Promise<number | null> {
  const storage = audioDb().storage.from(bucket)
  const info = await storage.info(path)
  const direct = Number(info.data?.size)
  if (!info.error && Number.isFinite(direct)) return direct

  // Older storage servers have no info endpoint: find it in its folder.
  const slash = path.lastIndexOf('/')
  const folder = slash === -1 ? '' : path.slice(0, slash)
  const name = slash === -1 ? path : path.slice(slash + 1)
  const { data, error } = await storage.list(folder, { search: name, limit: 100 })
  if (error) return null
  const found = (data ?? []).find((o: any) => o.name === name)
  const size = Number(found?.metadata?.size)
  return found && Number.isFinite(size) ? size : null
}

export { GAME_AUDIO_BUCKET, USER_AUDIO_BUCKET }
