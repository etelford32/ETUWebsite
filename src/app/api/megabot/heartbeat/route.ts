import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest, validateSession } from '@/lib/session'
import {
  verifyRunToken,
  verifyHeartbeatToken,
  issueHeartbeatToken,
  MAX_SCORE_PER_SECOND,
  RUN_TOKEN_MAX_AGE_MS,
} from '@/lib/runToken'

/**
 * Heartbeat endpoint — called once per cleared wave to record the run's
 * progress in a server-signed chain. Returns a fresh heartbeat token bound
 * to the (runId, wave, score, now); the next heartbeat sends this token
 * back so the server can audit the chain.
 *
 * Body: { runToken, prevHeartbeat | null, currentWave, currentScore }
 *
 * The server applies four guards:
 *   1. runToken must verify, and own the same userId as the session.
 *   2. If prevHeartbeat is supplied, it must verify and reference the same
 *      runId; currentWave + currentScore must monotonically grow.
 *   3. score-rate (delta / elapsed) between heartbeats must be plausible
 *      (<= MAX_SCORE_PER_SECOND).
 *   4. Run age (now - runToken.issuedAt) must be within RUN_TOKEN_MAX_AGE_MS.
 *
 * On any check failure we 400 with a reason; the client should treat that
 * as "stop sending heartbeats for this run" — score will still submit, just
 * unverified.
 */
export async function POST(request: NextRequest) {
  try {
    const session = getSessionFromRequest(request)
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    const { valid, user } = await validateSession(session)
    if (!valid || !user) {
      return NextResponse.json({ error: 'Invalid or expired session' }, { status: 401 })
    }

    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
    }
    const { runToken, prevHeartbeat, currentWave, currentScore } = body as {
      runToken?: string
      prevHeartbeat?: string | null
      currentWave?: number
      currentScore?: number
    }

    if (typeof currentWave !== 'number' || !Number.isFinite(currentWave) || currentWave < 0) {
      return NextResponse.json({ error: 'currentWave must be a non-negative number' }, { status: 400 })
    }
    if (typeof currentScore !== 'number' || !Number.isFinite(currentScore) || currentScore < 0) {
      return NextResponse.json({ error: 'currentScore must be a non-negative number' }, { status: 400 })
    }

    if (!runToken) {
      return NextResponse.json({ error: 'Missing runToken' }, { status: 400 })
    }
    const runRes = verifyRunToken(runToken, user.id)
    if (!runRes.valid) {
      return NextResponse.json({ error: `runToken: ${runRes.reason}` }, { status: 400 })
    }
    const runAge = Date.now() - runRes.payload.t
    if (runAge > RUN_TOKEN_MAX_AGE_MS) {
      return NextResponse.json({ error: 'runToken expired' }, { status: 400 })
    }
    const runId = runRes.payload.r

    // Optional chain check.
    if (prevHeartbeat) {
      const prevRes = verifyHeartbeatToken(prevHeartbeat, user.id)
      if (!prevRes.valid) {
        return NextResponse.json({ error: `prevHeartbeat: ${prevRes.reason}` }, { status: 400 })
      }
      if (prevRes.payload.r !== runId) {
        return NextResponse.json({ error: 'prevHeartbeat: run mismatch' }, { status: 400 })
      }
      if (currentWave < prevRes.payload.w) {
        return NextResponse.json({ error: 'wave moved backwards' }, { status: 400 })
      }
      if (currentScore < prevRes.payload.s) {
        return NextResponse.json({ error: 'score moved backwards' }, { status: 400 })
      }
      const elapsedMs = Date.now() - prevRes.payload.t
      const elapsedSec = Math.max(0.001, elapsedMs / 1000)
      const dScore = currentScore - prevRes.payload.s
      const ratePerSec = dScore / elapsedSec
      if (ratePerSec > MAX_SCORE_PER_SECOND) {
        return NextResponse.json(
          { error: `score rate ${Math.round(ratePerSec)}/s above ceiling ${MAX_SCORE_PER_SECOND}/s` },
          { status: 400 },
        )
      }
    }

    const issued = issueHeartbeatToken(user.id, runId, currentWave, currentScore)
    return NextResponse.json({ token: issued.token, issuedAt: issued.issuedAt })
  } catch (error: any) {
    console.error('[megabot/heartbeat] error:', error)
    return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 })
  }
}
