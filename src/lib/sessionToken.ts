/**
 * HMAC-signed session token — sign/verify for the etu_session cookie.
 *
 * Uses Web Crypto only (no Node `crypto`), so the same code runs in API
 * routes (Node) and in src/middleware.ts (Edge runtime).
 *
 * Token format: base64url(JSON payload) + '.' + base64url(HMAC-SHA256).
 * Legacy unsigned cookies fail verification and read as logged-out, so
 * rolling this out signs everyone out once.
 */

import type { SessionData } from './session'

const DEV_FALLBACK_SECRET = 'etu-dev-session-secret-do-not-use-in-prod'

let warnedFallback = false

export function getSessionSecret(): string {
  const secret =
    process.env.SESSION_SECRET ||
    process.env.ETU_SESSION_SECRET ||
    // Last resort so a deploy without SESSION_SECRET keeps signing rather
    // than falling back to something guessable — this var is already
    // required in production and never leaves the server.
    process.env.SUPABASE_SERVICE_ROLE_KEY

  if (secret) return secret

  if (process.env.NODE_ENV === 'production') {
    throw new Error('SESSION_SECRET must be set in production')
  }

  if (!warnedFallback) {
    console.warn('[session] No SESSION_SECRET set; using insecure dev fallback.')
    warnedFallback = true
  }
  return DEV_FALLBACK_SECRET
}

const encoder = new TextEncoder()
const decoder = new TextDecoder()

function toBase64Url(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(value: string): Uint8Array<ArrayBuffer> | null {
  try {
    const b64 = value.replace(/-/g, '+').replace(/_/g, '/')
    const binary = atob(b64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    return bytes
  } catch {
    return null
  }
}

async function getHmacKey(): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(getSessionSecret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  )
}

export async function signSession(data: SessionData): Promise<string> {
  const payload = toBase64Url(encoder.encode(JSON.stringify(data)))
  const key = await getHmacKey()
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload))
  return `${payload}.${toBase64Url(new Uint8Array(signature))}`
}

export async function verifySessionToken(token: string | undefined | null): Promise<SessionData | null> {
  if (!token) return null

  const dot = token.indexOf('.')
  if (dot <= 0 || dot === token.length - 1) return null

  const payload = token.slice(0, dot)
  const signature = fromBase64Url(token.slice(dot + 1))
  if (!signature) return null

  try {
    const key = await getHmacKey()
    // subtle.verify is constant-time — do not replace with a string compare.
    const valid = await crypto.subtle.verify('HMAC', key, signature, encoder.encode(payload))
    if (!valid) return null

    const payloadBytes = fromBase64Url(payload)
    if (!payloadBytes) return null

    const data = JSON.parse(decoder.decode(payloadBytes)) as SessionData
    if (!data || typeof data.userId !== 'string' || typeof data.email !== 'string') {
      return null
    }
    return data
  } catch {
    return null
  }
}
