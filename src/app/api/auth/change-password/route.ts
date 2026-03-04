import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabaseServer'
import { getSessionFromRequest } from '@/lib/session'
import { validatePassword } from '@/lib/passwordValidation'

export async function POST(request: NextRequest) {
  try {
    const session = getSessionFromRequest(request)

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized — please log in' }, { status: 401 })
    }

    const body = await request.json()
    const { newPassword, confirmPassword } = body

    if (!newPassword || !confirmPassword) {
      return NextResponse.json(
        { error: 'New password and confirmation are required' },
        { status: 400 }
      )
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json({ error: 'Passwords do not match' }, { status: 400 })
    }

    // Validate password strength
    const validation = validatePassword(newPassword)
    if (!validation.valid) {
      return NextResponse.json(
        { error: 'Password does not meet requirements', details: validation.errors },
        { status: 400 }
      )
    }

    const supabase = createServerClient()

    const { error: updateError } = await supabase.auth.admin.updateUserById(session.userId, {
      password: newPassword,
    })

    if (updateError) {
      console.error('Change password error:', updateError)
      return NextResponse.json(
        { error: 'Failed to update password. Please try again.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Password updated successfully.',
    })
  } catch (error: any) {
    console.error('Change password error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
