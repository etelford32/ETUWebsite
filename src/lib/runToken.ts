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
 * fall back to SESSION_SECRET (already used in this project) so we don't
 * need a separate env config in dev. Throws in production if neither is
 * set, since silently signing with a static fallback would be a quiet
 * anti-pattern.
 */
function getSecret(): string {
  const explicit = process.env.RUN_TOKEN_SECRET
  if (explicit) return explicit
  const fallback = process.env.SESSION_SECRET
  if (fallback) return fallback
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'RUN_TOKEN_SECRET (or SESSION_SECRET) must be set in production'
    )
  }
  // Dev-only fallback so local dev doesn't error before secrets are wired
  // up. Log so it's obvious in the dev console.
  console.warn(
    '[runToken] No RUN_TOKEN_SECRET / SESSION_SECRET set; using insecure dev fallback.'
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
 * spawn at 18 ships; with the clear-time tiers (×3 flawless), boss waves
 * (currentWave * 250 + 1000), and siege beats every 7th wave
 * (currentWave * 500 + 5000 + 25 * 60), legitimate skilled runs climb
 * fast. Per-wave ceiling is sized so a flawless wave-10 (~30k including
 * siege carryover) passes; flagrant cheats (wave 1, 999_999) still trip.
 */
export const MEGABOT_SCORE_CEILING_PER_WAVE = 18000
export const MEGABOT_SCORE_CEILING_BASE = 8000
export function megabotScoreCeiling(wave: number): number {
  return Math.max(MEGABOT_SCORE_CEILING_BASE, wave * MEGABOT_SCORE_CEILING_PER_WAVE + MEGABOT_SCORE_CEILING_BASE)
}

/** Minimum + maximum age (ms) we'll accept for a Megabot run. */
export const RUN_TOKEN_MIN_AGE_MS = 3_000        // 3s — block instant-submit attacks
export const RUN_TOKEN_MAX_AGE_MS = 60 * 60_000  // 60min — generous but bounded

// -----------------------------------------------------------------------------
// Heartbeat chain tokens
//
// In addition to the start-of-run token, the client posts a heartbeat at the
// end of every cleared wave. Each heartbeat returns a new chain token bound
// to (userId, runId, wave, score, issuedAt). The next heartbeat sends the
// previous chain token back so the server can:
//   - confirm the chain hasn't been forged
//   - confirm the run belongs to the same user + runId
//   - confirm wave + score only ever grow
//   - confirm score rate between beats is plausible
//
// At submit time, the client sends the most recent chain token; submit-score
// verifies the chain's claimed wave + score matches the submission. This
// closes the obvious "submit any score after waiting 3s" hole the pure
// run-token approach left open.
// -----------------------------------------------------------------------------

export interface HeartbeatPayload {
  /** User who started the run. */
  u: string
  /** Run identifier (matches the underlying run-token). */
  r: string
  /** Wave cleared at time of beat. */
  w: number
  /** Cumulative score at time of beat. */
  s: number
  /** issuedAt (ms since epoch). */
  t: number
}

export function issueHeartbeatToken(
  userId: string,
  runId: string,
  wave: number,
  score: number,
): { token: string; issuedAt: number } {
  const payload: HeartbeatPayload = {
    u: userId,
    r: runId,
    w: Math.max(0, Math.floor(wave)),
    s: Math.max(0, Math.floor(score)),
    t: Date.now(),
  }
  const body = base64url(JSON.stringify(payload))
  const sig = sign(body)
  return { token: `${body}.${sig}`, issuedAt: payload.t }
}

export type VerifyHeartbeatResult =
  | { valid: true; payload: HeartbeatPayload }
  | { valid: false; reason: string }

export function verifyHeartbeatToken(
  token: string,
  expectedUserId: string,
): VerifyHeartbeatResult {
  if (!token || typeof token !== 'string') {
    return { valid: false, reason: 'missing heartbeat' }
  }
  const dot = token.indexOf('.')
  if (dot < 1 || dot === token.length - 1) {
    return { valid: false, reason: 'malformed heartbeat' }
  }
  const body = token.slice(0, dot)
  const sig = token.slice(dot + 1)
  const expected = sign(body)
  let sigBuf: Buffer, expBuf: Buffer
  try {
    sigBuf = fromBase64url(sig)
    expBuf = fromBase64url(expected)
  } catch {
    return { valid: false, reason: 'malformed heartbeat sig' }
  }
  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
    return { valid: false, reason: 'bad heartbeat sig' }
  }
  let payload: HeartbeatPayload
  try {
    payload = JSON.parse(fromBase64url(body).toString('utf8')) as HeartbeatPayload
  } catch {
    return { valid: false, reason: 'malformed heartbeat payload' }
  }
  if (
    !payload ||
    typeof payload.u !== 'string' ||
    typeof payload.r !== 'string' ||
    typeof payload.w !== 'number' ||
    typeof payload.s !== 'number' ||
    typeof payload.t !== 'number'
  ) {
    return { valid: false, reason: 'invalid heartbeat payload' }
  }
  if (payload.u !== expectedUserId) {
    return { valid: false, reason: 'heartbeat owner mismatch' }
  }
  return { valid: true, payload }
}

/** Maximum legitimate score increase per second between heartbeats. */
export const MAX_SCORE_PER_SECOND = 10_000

/**
 * Tolerance (in score units) when matching submitted score to the latest
 * heartbeat. Heartbeats fire at end-of-wave, so the legit delta between
 * "last beat" and "submit at game-over" is the kill score from a partial
 * wave-of-death. Worst-case (mid-siege death with all 18 ships dropped at
 * combo cap) ≈ 14_000, so 12_000 leaves a safety margin without giving
 * forgers much room.
 */
export const HEARTBEAT_SCORE_TOLERANCE = 12_000

/** Tolerance (in waves) — submission's level may be heartbeat.w or heartbeat.w + 1 (mid-wave death). */
export const HEARTBEAT_WAVE_TOLERANCE = 1
