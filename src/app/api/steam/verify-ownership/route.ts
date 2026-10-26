import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabaseServer'
import { getSessionFromRequest } from '@/lib/session'
import { validateCSRFFromRequest } from '@/lib/csrf'
import { checkRateLimit } from '@/lib/ratelimit'
import { verifyOwnership } from '@/lib/steamOwnership'

export const dynamic = 'force-dynamic'

/**
 * POST /api/steam/verify-ownership - Re-check whether the signed-in
 * account's linked Steam ID owns the game, and store the result.
 *
 * The callback already does this after sign-in/link; this is the
 * "Verify game ownership" button for players who bought the game later.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized - Please log in' }, { status: 401 })
    }
    if (!(await validateCSRFFromRequest(request))) {
      return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 })
    }
    // Steam's partner API is rate-limited; one player re-checking in a loop
    // shouldn't spend that budget.
    const limit = checkRateLimit(`steam-verify:${session.userId}`, 5, 10 * 60 * 1000)
    if (!limit.allowed) {
      return NextResponse.json(
        { error: 'rate_limited', message: 'Please wait a few minutes before checking again.' },
        { status: 429 }
      )
    }

    const supabase = createServerClient()
    const { data: profile } = await (supabase.from('profiles') as any)
      .select('steam_id')
      .eq('id', session.userId)
      .maybeSingle()
    if (!profile?.steam_id) {
      return NextResponse.json(
        { error: 'no_steam', message: 'Link your Steam account first.' },
        { status: 409 }
      )
    }

    const outcome = await verifyOwnership(session.userId, profile.steam_id)
    switch (outcome.status) {
      case 'owned':
        return NextResponse.json({
          success: true,
          owns_app: true,
          family_shared: outcome.familyShared,
          verified_at: outcome.verifiedAt,
          checked_at: outcome.checkedAt,
        })
      case 'not_owned':
        return NextResponse.json({ success: true, owns_app: false, checked_at: outcome.checkedAt })
      case 'not_configured':
        return NextResponse.json(
          { error: 'not_configured', message: 'Ownership verification is not enabled yet.' },
          { status: 503 }
        )
      default:
        return NextResponse.json(
          { error: 'steam_unavailable', message: "Steam didn't respond. Please try again in a minute." },
          { status: 502 }
        )
    }
  } catch (error: any) {
    console.error('Steam verify-ownership error:', error)
    return NextResponse.json({ error: 'Failed to verify ownership' }, { status: 500 })
  }
}
