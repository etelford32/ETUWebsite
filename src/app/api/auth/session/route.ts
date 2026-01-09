import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest, validateSession } from '@/lib/session'

export async function GET(request: NextRequest) {
  try {
    const session = getSessionFromRequest(request)

    if (!session) {
      return NextResponse.json(
        { authenticated: false, user: null },
        { status: 200 }
      )
    }

    // Validate session and get fresh user data
    const { valid, user } = await validateSession(session)

    if (!valid) {
      return NextResponse.json(
        { authenticated: false, user: null },
        { status: 200 }
      )
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        email: session.email,
        username: user.username,
        role: user.role || 'user',
        avatar_url: user.avatar_url,
        steam_id: user.steam_id,
        faction_choice: user.faction_choice,
      },
    })
  } catch (error: any) {
    console.error('Session check error:', error)
    return NextResponse.json(
      { authenticated: false, user: null },
      { status: 200 }
    )
  }
}
