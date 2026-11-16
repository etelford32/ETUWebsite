/**
 * AUDIO-02: read a Google Drive folder of audio through the Drive API.
 * Server only. Nothing is ever written to Drive.
 *
 * Two ways to authorise, in order of preference:
 *
 *   GOOGLE_DRIVE_SERVICE_ACCOUNT   a service account's JSON key (as is, or
 *                                  base64). Share the folder with the
 *                                  account's email as Viewer; the folder
 *                                  stays private.
 *   GOOGLE_DRIVE_API_KEY           an API key. Only works if the folder is
 *                                  shared "Anyone with the link", which
 *                                  makes every file in it public.
 *
 * GOOGLE_DRIVE_AUDIO_FOLDER is the folder's id or its Drive URL.
 */

import { createSign } from 'crypto'

const API = 'https://www.googleapis.com/drive/v3'
const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const SCOPE = 'https://www.googleapis.com/auth/drive.readonly'
const FOLDER_MIME = 'application/vnd.google-apps.folder'
/** Subfolders deeper than this are ignored (`sfx/<group>/<file>` is 2). */
const MAX_DEPTH = 3
const MAX_FILES = 2000

export interface DriveConfig {
  folderId: string
  auth: { type: 'service_account'; email: string; privateKey: string } | { type: 'api_key'; key: string }
}

export interface DriveAudioFile {
  id: string
  /** Path relative to the folder, e.g. `Battle Wave/Grind.mp3`. */
  path: string
  /** Changes exactly when the file's bytes change. */
  md5: string
  size: number
}

export class DriveError extends Error {
  constructor(
    public code: 'not_configured' | 'unauthorized' | 'not_found' | 'rate_limited' | 'too_large' | 'unavailable',
    message: string
  ) {
    super(message)
  }
}

/** A folder id out of an id or any Drive folder URL. */
export function parseFolderId(value: string): string | null {
  const text = value.trim()
  const fromUrl = /\/folders\/([A-Za-z0-9_-]{10,})/.exec(text) ?? /[?&]id=([A-Za-z0-9_-]{10,})/.exec(text)
  const id = fromUrl ? fromUrl[1] : text
  return /^[A-Za-z0-9_-]{10,}$/.test(id) ? id : null
}

function parseServiceAccount(raw: string): { email: string; privateKey: string } | null {
  const text = raw.trim()
  for (const candidate of [text, text.startsWith('{') ? '' : Buffer.from(text, 'base64').toString('utf8')]) {
    if (!candidate) continue
    try {
      const key = JSON.parse(candidate)
      if (typeof key?.client_email === 'string' && typeof key?.private_key === 'string') {
        // An env var often carries the key's newlines as a literal "\n".
        return { email: key.client_email, privateKey: key.private_key.replace(/\\n/g, '\n') }
      }
    } catch {
      // try the next reading
    }
  }
  return null
}

export function getDriveConfig(): DriveConfig | null {
  const folderId = parseFolderId(process.env.GOOGLE_DRIVE_AUDIO_FOLDER || '')
  if (!folderId) return null
  const account = parseServiceAccount(process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT || '')
  if (account) return { folderId, auth: { type: 'service_account', ...account } }
  const key = (process.env.GOOGLE_DRIVE_API_KEY || '').trim()
  if (key) return { folderId, auth: { type: 'api_key', key } }
  return null
}

const b64url = (input: Buffer | string) => Buffer.from(input).toString('base64url')

/** The signed assertion Google exchanges for an access token (RFC 7523). */
export function serviceAccountAssertion(email: string, privateKey: string, nowSeconds: number): string {
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const claims = b64url(JSON.stringify({ iss: email, scope: SCOPE, aud: TOKEN_URL, iat: nowSeconds, exp: nowSeconds + 3600 }))
  const signature = createSign('RSA-SHA256').update(`${header}.${claims}`).sign(privateKey)
  return `${header}.${claims}.${b64url(signature)}`
}

let cachedToken: { email: string; token: string; expiresAt: number } | null = null

async function accessToken(email: string, privateKey: string): Promise<string> {
  if (cachedToken && cachedToken.email === email && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.token
  let assertion: string
  try {
    assertion = serviceAccountAssertion(email, privateKey, Math.floor(Date.now() / 1000))
  } catch {
    throw new DriveError('unauthorized', 'GOOGLE_DRIVE_SERVICE_ACCOUNT does not hold a usable private key.')
  }
  let response: Response
  try {
    response = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }),
      cache: 'no-store',
    })
  } catch {
    throw new DriveError('unavailable', 'Could not reach Google.')
  }
  const body: any = await response.json().catch(() => null)
  if (!response.ok || typeof body?.access_token !== 'string') {
    throw new DriveError('unauthorized', 'Google rejected the service account in GOOGLE_DRIVE_SERVICE_ACCOUNT.')
  }
  cachedToken = { email, token: body.access_token, expiresAt: Date.now() + (Number(body.expires_in) || 3600) * 1000 }
  return cachedToken.token
}

async function drive(config: DriveConfig, path: string, params: Record<string, string>): Promise<Response> {
  const url = new URL(`${API}${path}`)
  for (const [name, value] of Object.entries(params)) url.searchParams.set(name, value)
  const headers: Record<string, string> = {}
  if (config.auth.type === 'api_key') url.searchParams.set('key', config.auth.key)
  else headers.Authorization = `Bearer ${await accessToken(config.auth.email, config.auth.privateKey)}`

  let response: Response
  try {
    response = await fetch(url, { headers, cache: 'no-store' })
  } catch {
    throw new DriveError('unavailable', 'Could not reach Google Drive.')
  }
  if (response.ok) return response
  const detail: any = await response.json().catch(() => null)
  const reason: string = detail?.error?.errors?.[0]?.reason ?? ''
  if (response.status === 429 || /rateLimit|quota/i.test(reason)) {
    throw new DriveError('rate_limited', 'Google Drive rate limit reached; try again later.')
  }
  if (response.status === 401 || response.status === 403) {
    throw new DriveError(
      'unauthorized',
      config.auth.type === 'api_key'
        ? 'Google Drive refused the API key. Is the Drive API enabled for it, and the folder shared with anyone who has the link?'
        : `Google Drive refused access. Is the Drive API enabled, and the folder shared with ${config.auth.email}?`
    )
  }
  if (response.status === 404) {
    throw new DriveError(
      'not_found',
      config.auth.type === 'api_key'
        ? 'Drive folder not found. Check GOOGLE_DRIVE_AUDIO_FOLDER and that the folder is shared by link.'
        : `Drive folder not found. Check GOOGLE_DRIVE_AUDIO_FOLDER and share the folder with ${config.auth.email}.`
    )
  }
  throw new DriveError('unavailable', `Google Drive answered ${response.status}.`)
}

/** Every file under the folder (subfolders included), with its relative path. */
export async function listDriveAudio(config: DriveConfig): Promise<DriveAudioFile[]> {
  const files: DriveAudioFile[] = []
  const queue: { id: string; prefix: string; depth: number }[] = [{ id: config.folderId, prefix: '', depth: 0 }]
  const seenFolders = new Set<string>([config.folderId])

  while (queue.length) {
    const folder = queue.shift()!
    let pageToken = ''
    do {
      const params: Record<string, string> = {
        q: `'${folder.id}' in parents and trashed = false`,
        fields: 'nextPageToken, files(id, name, mimeType, md5Checksum, size)',
        pageSize: '1000',
        orderBy: 'name',
        supportsAllDrives: 'true',
        includeItemsFromAllDrives: 'true',
      }
      if (pageToken) params.pageToken = pageToken
      const page: any = await (await drive(config, '/files', params)).json()
      for (const entry of Array.isArray(page?.files) ? page.files : []) {
        if (typeof entry?.id !== 'string' || typeof entry?.name !== 'string') continue
        // A "/" in a Drive name would read as a folder boundary.
        const name = entry.name.replace(/\//g, '-')
        if (entry.mimeType === FOLDER_MIME) {
          if (folder.depth < MAX_DEPTH && !seenFolders.has(entry.id)) {
            seenFolders.add(entry.id)
            queue.push({ id: entry.id, prefix: `${folder.prefix}${name}/`, depth: folder.depth + 1 })
          }
          continue
        }
        // Google Docs and shortcuts have no md5; they are not audio files.
        if (typeof entry.md5Checksum !== 'string') continue
        files.push({ id: entry.id, path: `${folder.prefix}${name}`, md5: entry.md5Checksum, size: Number(entry.size ?? 0) })
        if (files.length > MAX_FILES) {
          throw new DriveError('too_large', `The Drive folder holds more than ${MAX_FILES} files.`)
        }
      }
      pageToken = typeof page?.nextPageToken === 'string' ? page.nextPageToken : ''
    } while (pageToken)
  }
  return files
}

/** The bytes of one Drive file. */
export async function fetchDriveFile(config: DriveConfig, id: string): Promise<Uint8Array> {
  if (!/^[A-Za-z0-9_-]{10,}$/.test(id)) throw new DriveError('not_found', 'Bad Drive file id.')
  const response = await drive(config, `/files/${id}`, { alt: 'media', supportsAllDrives: 'true' })
  return new Uint8Array(await response.arrayBuffer())
}
