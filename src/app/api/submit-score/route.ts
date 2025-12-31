import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabaseServer'

const supabase = createServerClient()

export async function POST(request: NextRequest) {
  try {
    // Get authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Missing authorization header' },
        { status: 401 }
      )
    }

    // Verify the user is authenticated via Supabase
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid or expired authentication token' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const {
      score,
      mode,
      platform,
      level = 1,
      time_seconds = null,
      metadata = null,
    } = body

    // Basic validation
    if (!score || !mode || !platform) {
      return NextResponse.json(
        { error: 'Missing required fields: score, mode, platform' },
        { status: 400 }
      )
    }

    // Validate score value
    if (typeof score !== 'number' || score < 0) {
      return NextResponse.json(
        { error: 'Score must be a positive number' },
        { status: 400 }
      )
    }

    // Validate mode
    const validModes = ['speedrun', 'survival', 'discovery', 'boss_rush', 'global']
    if (!validModes.includes(mode)) {
      return NextResponse.json(
        { error: `Invalid mode. Must be one of: ${validModes.join(', ')}` },
        { status: 400 }
      )
    }

    // Validate platform
    const validPlatforms = ['PC', 'Mac', 'Linux', 'PS', 'Xbox', 'Switch']
    if (!validPlatforms.includes(platform)) {
      return NextResponse.json(
        { error: `Invalid platform. Must be one of: ${validPlatforms.join(', ')}` },
        { status: 400 }
      )
    }

    // All scores start as unverified to prevent cheating
    // Verification happens server-side or through manual review
    const is_verified = false

    // Insert score - use authenticated user's ID, not client-provided user_id
    const { data, error } = await (supabase as any)
      .from('player_scores')
      .insert({
        user_id: user.id, // CRITICAL: Always use authenticated user's ID
        score, // Already validated as number
        mode,
        platform,
        level: typeof level === 'number' ? level : parseInt(level),
        time_seconds: time_seconds ? (typeof time_seconds === 'number' ? time_seconds : parseInt(time_seconds)) : null,
        is_verified,
        metadata: metadata || {},
      })
      .select()
      .single()

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      score: data,
    })
  } catch (error: any) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
