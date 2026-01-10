import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabaseServer'
import { getSessionFromRequest } from '@/lib/session'

/**
 * GET /api/profile - Get current user's profile
 */
export async function GET(request: NextRequest) {
  try {
    const session = getSessionFromRequest(request)

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized - Please log in' },
        { status: 401 }
      )
    }

    const supabase = createServerClient()

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.userId)
      .single()

    if (error) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ profile })
  } catch (error: any) {
    console.error('Get profile error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/profile - Update current user's profile
 */
export async function PATCH(request: NextRequest) {
  try {
    const session = getSessionFromRequest(request)

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized - Please log in' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { username, avatar_url, faction_choice, is_public } = body

    // Validate and build update object with explicit typing
    const updates: {
      username?: string
      avatar_url?: string | null
      faction_choice?: string | null
      is_public?: boolean
    } = {}

    if (username !== undefined) updates.username = username
    if (avatar_url !== undefined) updates.avatar_url = avatar_url
    if (faction_choice !== undefined) updates.faction_choice = faction_choice
    if (is_public !== undefined) updates.is_public = Boolean(is_public)

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      )
    }

    const supabase = createServerClient()

    // Update profile (RLS ensures user can only update their own)
    const { data: profile, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', session.userId)
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { error: error.message || 'Failed to update profile' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      profile,
    })
  } catch (error: any) {
    console.error('Update profile error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
