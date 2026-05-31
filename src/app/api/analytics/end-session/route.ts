import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabaseServer'
import { RateLimiters, getIdentifier } from '@/lib/ratelimit'

/**
 * POST /api/analytics/end-session — close a session and compute its duration.
 * Best-effort (often fired from beforeunload / visibilitychange).
 */
export async function POST(request: NextRequest) {
  try {
    if (!RateLimiters.public(getIdentifier(request)).allowed) {
      return NextResponse.json({ ok: false }, { status: 429 })
    }

    const body = await request.json().catch(() => null)
    const sessionId = body?.session_id
    if (!sessionId) {
      return NextResponse.json({ ok: false, error: 'session_id required' }, { status: 400 })
    }

    const supabase = createServerClient()
    await (supabase.rpc as any)('end_user_session', { p_session_id: sessionId })

    return NextResponse.json({ ok: true })
  } catch (error: any) {
    console.error('analytics/end-session error:', error?.message || error)
    return NextResponse.json({ ok: false }, { status: 200 })
  }
}
