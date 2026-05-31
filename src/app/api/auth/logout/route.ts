import { NextRequest, NextResponse } from 'next/server'
import { deleteSessionFromResponse, getSessionFromRequest } from '@/lib/session'
import { recordAuthEvent } from '@/lib/authEvents'

export async function POST(request: NextRequest) {
  try {
    // Capture who is logging out before we clear the cookie.
    const session = getSessionFromRequest(request)
    if (session) {
      await recordAuthEvent({
        eventType: 'logout',
        request,
        userId: session.userId,
        email: session.email,
      })
    }

    const response = NextResponse.json({
      success: true,
      message: 'Logged out successfully',
    })

    // Delete the session cookie
    deleteSessionFromResponse(response)

    return response
  } catch (error: any) {
    console.error('Logout error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
