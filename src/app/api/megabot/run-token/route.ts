import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest, validateSession } from '@/lib/session'
import { issueRunToken } from '@/lib/runToken'

/**
 * Issue a fresh signed run-token to start a Megabot Arena run. The client
 * stashes this token and includes it in the eventual /api/submit-score
 * payload; submit-score verifies + applies plausibility checks before
 * marking the score is_verified=true.
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

    const issued = issueRunToken(user.id)
    return NextResponse.json({
      token: issued.token,
      runId: issued.runId,
      issuedAt: issued.issuedAt,
    })
  } catch (error: any) {
    console.error('[megabot/run-token] error:', error)
    return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 })
  }
}
