import { NextRequest, NextResponse } from 'next/server'
import { deleteSessionFromResponse } from '@/lib/session'

export async function POST(request: NextRequest) {
  try {
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
