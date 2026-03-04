import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabaseServer'
import { consumeResetToken } from '@/lib/resetTokenStore'
import { validatePassword } from '@/lib/passwordValidation'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token, password } = body

    if (!token || !password) {
      return NextResponse.json(
        { error: 'Reset token and new password are required' },
        { status: 400 }
      )
    }

    // Validate password strength
    const validation = validatePassword(password)
    if (!validation.valid) {
      return NextResponse.json(
        { error: 'Password does not meet requirements', details: validation.errors },
        { status: 400 }
      )
    }

    // Consume the token (single-use, verifies expiry)
    const entry = consumeResetToken(token)

    if (!entry) {
      return NextResponse.json(
        { error: 'Reset link is invalid or has expired. Please request a new one.' },
        { status: 400 }
      )
    }

    const supabase = createServerClient()

    // Update the user's password via Supabase Admin
    const { error: updateError } = await supabase.auth.admin.updateUserById(entry.userId, {
      password,
    })

    if (updateError) {
      console.error('Password update error:', updateError)
      return NextResponse.json(
        { error: 'Failed to update password. Please try again.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Password updated successfully. Please log in with your new password.',
    })
  } catch (error: any) {
    console.error('Reset password error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
