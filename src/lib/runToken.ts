import { createHmac, timingSafeEqual, randomUUID } from 'crypto'

/**
 * HMAC-signed run token used to verify Megabot Arena score submissions.
 *
 * The Arena is a browser-based mini-game, so the score itself is supplied
 * by the client and trivially forgeable on its own. To raise the bar, we:
 *
 *   1. Issue a server-signed token at game start (POST /api/megabot/run-token)
 *      keyed by the player's user id and a fresh runId.
 *   2. Require the token at submit time. Submit verifies signature, ownership
 *      (userId in token must match the session), age (must be a real run,
 *      not instant), and that the score is plausible for the wave count.
 *
 * If all checks pass the score is inserted with is_verified=true; otherwise
 * the score still inserts but stays unverified, preserving the existing
 * "show unverified Megabot scores" behavior in the leaderboard until a
 * future replay-token sprint tightens it further.
 */

export interface RunTokenPayload {
  /** User who started the run (matches Supabase profile id). */
  u: string
  /** Run identifier (random UUID); used for de-dupe + audit. */
  r: string
  /** issuedAt (ms since epoch). */
  t: number
}

const ALGO = 'sha256'

/**
 * Resolve the signing secret. We read RUN_TOKEN_SECRET from the env and
 * fall back to ETU_SESSION_SECRET (already used in this project) so we
 * don't need a separate env config in dev. Throws in production if
 * neither is set, since silently signing with a static fallback would be
 * a quiet anti-pattern.
 */
function getSecret(): string {
  const explicit = process.env.RUN_TOKEN_SECRET
  if (explicit) return explicit
  const fallback = process.env.ETU_SESSION_SECRET
  if (fallback) return fallback
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'RUN_TOKEN_SECRET (or ETU_SESSION_SECRET) must be set in production'
    )
  }
  // Dev-only fallback so local dev doesn't error before secrets are wired
  // up. Log so it's obvious in the dev console.
  console.warn(
    '[runToken] No RUN_TOKEN_SECRET / ETU_SESSION_SECRET set; using insecure dev fallback.'
  )
  return 'etu-megabot-dev-only-fallback'
}

function base64url(buf: Buffer | string): string {
  const b = typeof buf === 'string' ? Buffer.from(buf, 'utf8') : buf
  return b.toString('base64')
    .replace(/=+$/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
}

function fromBase64url(s: string): Buffer {
  const padLen = (4 - (s.length % 4)) % 4
  const padded = s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat(padLen)
  return Buffer.from(padded, 'base64')
}

function sign(body: string): string {
  return base64url(createHmac(ALGO, getSecret()).update(body).digest())
}

/**
 * Issue a fresh run token for a user. Returns the encoded token and the
 * underlying payload (caller may want to record runId for audit).
 */
export function issueRunToken(userId: string): { token: string; runId: string; issuedAt: number } {
  const payload: RunTokenPayload = {
    u: userId,
    r: randomUUID(),
    t: Date.now(),
  }
  const body = base64url(JSON.stringify(payload))
  const sig = sign(body)
  return {
    token: `${body}.${sig}`,
    runId: payload.r,
    issuedAt: payload.t,
  }
}

export type VerifyResult =
  | { valid: true; payload: RunTokenPayload }
  | { valid: false; reason: string }

/**
 * Verify a run token: shape, signature, and that the embedded userId
 * matches the supplied expected user. Does NOT enforce age — callers do
 * that policy check themselves.
 */
export function verifyRunToken(token: string, expectedUserId: string): VerifyResult {
  if (!token || typeof token !== 'string') {
    return { valid: false, reason: 'missing token' }
  }
  const dot = token.indexOf('.')
  if (dot < 1 || dot === token.length - 1) {
    return { valid: false, reason: 'malformed token' }
  }
  const body = token.slice(0, dot)
  const sig = token.slice(dot + 1)
  const expected = sign(body)

  // Constant-time compare to avoid timing leaks.
  let sigBuf: Buffer, expBuf: Buffer
  try {
    sigBuf = fromBase64url(sig)
    expBuf = fromBase64url(expected)
  } catch {
    return { valid: false, reason: 'malformed signature' }
  }
  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
    return { valid: false, reason: 'bad signature' }
  }

  let payload: RunTokenPayload
  try {
    payload = JSON.parse(fromBase64url(body).toString('utf8')) as RunTokenPayload
  } catch {
    return { valid: false, reason: 'malformed payload' }
  }
  if (!payload || typeof payload.u !== 'string' || typeof payload.t !== 'number') {
    return { valid: false, reason: 'invalid payload' }
  }
  if (payload.u !== expectedUserId) {
    return { valid: false, reason: 'token owner mismatch' }
  }
  return { valid: true, payload }
}

/**
 * Per-mode score-plausibility ceiling. Megabot Arena waves cap regular
 * spawn at 18 ships; including combo + wave bonus a "perfect" wave is
 * roughly 18 * 800 (combo cap) + wave*100 ≈ 14600 at high waves. We use
 * a slightly looser per-wave allowance (12000) plus a flat 5000 base so
 * a clean wave 1-2 still passes.
 */
export const MEGABOT_SCORE_CEILING_PER_WAVE = 12000
export const MEGABOT_SCORE_CEILING_BASE = 5000
export function megabotScoreCeiling(wave: number): number {
  return Math.max(MEGABOT_SCORE_CEILING_BASE, wave * MEGABOT_SCORE_CEILING_PER_WAVE + MEGABOT_SCORE_CEILING_BASE)
}

/** Minimum + maximum age (ms) we'll accept for a Megabot run. */
export const RUN_TOKEN_MIN_AGE_MS = 3_000        // 3s — block instant-submit attacks
export const RUN_TOKEN_MAX_AGE_MS = 60 * 60_000  // 60min — generous but bounded
