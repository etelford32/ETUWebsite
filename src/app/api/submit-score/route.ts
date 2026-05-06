import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabaseServer'
import { getSessionFromRequest, validateSession } from '@/lib/session'

const VALID_MODES = ['speedrun', 'survival', 'discovery', 'boss_rush', 'megabot', 'global']
const VALID_PLATFORMS = ['PC', 'Mac', 'Linux', 'PS', 'Xbox', 'Switch']

export async function POST(request: NextRequest) {
  try {
    // Auth: cookie-based session (matches the rest of the API surface).
    const session = getSessionFromRequest(request)
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    const { valid, user } = await validateSession(session)
    if (!valid || !user) {
      return NextResponse.json({ error: 'Invalid or expired session' }, { status: 401 })
    }

    const body = await request.json()
    const {
      score,
      mode,
      platform = 'PC',
      level = 1,
      time_seconds = null,
      metadata = null,
    } = body

    // Basic validation
    if (typeof score !== 'number' || !isFinite(score) || score < 0) {
      return NextResponse.json(
        { error: 'Score must be a non-negative number' },
        { status: 400 }
      )
    }
    if (!VALID_MODES.includes(mode)) {
      return NextResponse.json(
        { error: `Invalid mode. Must be one of: ${VALID_MODES.join(', ')}` },
        { status: 400 }
      )
    }
    if (!VALID_PLATFORMS.includes(platform)) {
      return NextResponse.json(
        { error: `Invalid platform. Must be one of: ${VALID_PLATFORMS.join(', ')}` },
        { status: 400 }
      )
    }

    // All scores start as unverified to prevent cheating.
    // Verification happens server-side or through manual review.
    const supabase = createServerClient()
    const { data, error } = await (supabase as any)
      .from('player_scores')
      .insert({
        user_id: user.id, // CRITICAL: trust only the server-side session
        score,
        mode,
        platform,
        level: typeof level === 'number' ? level : parseInt(level, 10),
        time_seconds:
          time_seconds == null
            ? null
            : typeof time_seconds === 'number'
              ? time_seconds
              : parseInt(time_seconds, 10),
        is_verified: false,
        metadata: metadata || {},
      })
      .select()
      .single()

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, score: data })
  } catch (error: any) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
