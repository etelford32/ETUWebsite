import { NextRequest, NextResponse } from 'next/server'
import { resetRateLimitByPrefix } from '@/lib/ratelimit'

/**
 * POST /api/auth/clear-rate-limit
 *
 * Emergency unblock for users who've hammered the auth endpoints during
 * testing and tripped the in-memory rate-limiter (e.g. a stuck "Too many
 * login attempts" loop). Gated by CRON_SECRET — the same shared admin
 * secret already used by the cron jobs — so the user can curl from their
 * terminal even if they're locked out of the UI.
 *
 * Usage:
 *   curl -X POST https://exploretheuniverse2175.com/api/auth/clear-rate-limit \
 *        -H "Authorization: Bearer $CRON_SECRET" \
 *        -H "Content-Type: application/json" \
 *        -d '{"email":"you@example.com"}'
 *
 * The reset clears every bucket whose identifier starts with the email
 * (i.e. all (email, IP, user-agent-hash) tuples), so any active lock
 * across browsers / devices is wiped in one call.
 *
 * Note: The rate-limiter is in-memory per Vercel function instance, so
 * this resets only the instance handling the request. In practice that's
 * almost always the same instance the user got stuck on (warm functions
 * are sticky), but if not, retry once.
 */
export async function POST(request: NextRequest) {
  // Auth gate: shared admin token, NOT a session cookie. Locked-out users
  // can't pass a session — that's the whole point of having this endpoint.
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    return NextResponse.json(
      { error: 'CRON_SECRET not configured on this deployment' },
      { status: 503 }
    )
  }

  const authHeader = request.headers.get('authorization') || ''
  const provided = authHeader.startsWith('Bearer ')
    ? authHeader.slice('Bearer '.length).trim()
    : ''
  if (!provided || provided !== cronSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const email = (body?.email || '').toString().trim().toLowerCase()
  if (!email || !email.includes('@')) {
    return NextResponse.json(
      { error: 'Body must include an "email" field' },
      { status: 400 }
    )
  }

  // The rate-limiter keys buckets as `${email}:${ip}:${ua-hash}`, so any
  // bucket for this email starts with `${email}:`. Wipe all matches.
  const cleared = resetRateLimitByPrefix(`${email}:`)

  return NextResponse.json({
    success: true,
    email,
    bucketsCleared: cleared,
    note:
      'In-memory limiter is per-instance; if the user is still blocked, ' +
      'their request may have hit a different Vercel function instance. ' +
      'Retry the call once.',
  })
}
