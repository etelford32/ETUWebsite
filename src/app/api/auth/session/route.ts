import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest, validateSession } from '@/lib/session'

export async function GET(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request)

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
        displayName: user.display_name,
        role: user.role || 'user',
        isAlphaTester: user.is_alpha_tester ?? false,
        status: user.status,
        createdAt: user.created_at,
        lastLoginAt: user.last_login_at,
        loginCount: user.login_count ?? 0,
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
