import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Database } from '@/lib/types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      user_id,
      score,
      mode,
      platform,
      level = 1,
      time_seconds = null,
      metadata = null,
      auth_token // For game client authentication
    } = body

    // Basic validation
    if (!user_id || !score || !mode || !platform) {
      return NextResponse.json(
        { error: 'Missing required fields: user_id, score, mode, platform' },
        { status: 400 }
      )
    }

    // TODO: Validate auth_token (Steam ticket or your own game auth)
    // For now, we'll mark scores as verified if they have a token
    const is_verified = !!auth_token

    // Insert score
    const { data, error } = await supabase
      .from('player_scores')
      .insert({
        user_id,
        score: parseInt(score),
        mode,
        platform,
        level: parseInt(level),
        time_seconds: time_seconds ? parseInt(time_seconds) : null,
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
