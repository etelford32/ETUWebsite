import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/session'

/**
 * GET /api/csrf-token
 * Returns the CSRF token for the current session
 * This allows clients to retrieve the token and include it in POST/PATCH/DELETE requests
 */
export async function GET(request: NextRequest) {
  const session = getSessionFromRequest(request)

  if (!session || !session.csrfToken) {
    return NextResponse.json(
      { error: 'No active session or CSRF token not found' },
      { status: 401 }
    )
  }

  return NextResponse.json({
    csrfToken: session.csrfToken
  })
}
