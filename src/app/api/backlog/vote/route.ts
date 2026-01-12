import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabaseServer'
import { getSessionFromRequest } from '@/lib/session'
import { validateCSRFFromRequest } from '@/lib/csrf'

export async function POST(request: NextRequest) {
  try {
    // Require authentication
    const session = getSessionFromRequest(request)
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized - Please log in' },
        { status: 401 }
      )
    }

    // Validate CSRF token
    if (!validateCSRFFromRequest(request)) {
      return NextResponse.json(
        { error: 'Invalid CSRF token' },
        { status: 403 }
      )
    }

    const supabase = createServerClient()
    const body = await request.json()
    const { backlog_item_id } = body

    // Use authenticated user's ID, not client-provided ID
    const user_id = session.userId

    // Validation
    if (!backlog_item_id) {
      return NextResponse.json(
        { error: 'Missing required field: backlog_item_id' },
        { status: 400 }
      )
    }

    // Check if user already voted
    const { data: existingVote } = await supabase
      .from('backlog_votes')
      .select('id')
      .eq('user_id', user_id)
      .eq('backlog_item_id', backlog_item_id)
      .single()

    if (existingVote) {
      return NextResponse.json(
        { error: 'You have already voted on this item' },
        { status: 400 }
      )
    }

    // Insert vote
    const { data, error } = await supabase
      .from('backlog_votes')
      .insert({
        user_id,
        backlog_item_id
      } as any)
      .select()
      .single()

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      vote: data
    })
  } catch (error: any) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Require authentication
    const session = getSessionFromRequest(request)
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized - Please log in' },
        { status: 401 }
      )
    }

    // Validate CSRF token
    if (!validateCSRFFromRequest(request)) {
      return NextResponse.json(
        { error: 'Invalid CSRF token' },
        { status: 403 }
      )
    }

    const supabase = createServerClient()
    const body = await request.json()
    const { backlog_item_id } = body

    // Use authenticated user's ID, not client-provided ID
    const user_id = session.userId

    // Validation
    if (!backlog_item_id) {
      return NextResponse.json(
        { error: 'Missing required field: backlog_item_id' },
        { status: 400 }
      )
    }

    // Delete vote
    const { error } = await supabase
      .from('backlog_votes')
      .delete()
      .eq('user_id', user_id)
      .eq('backlog_item_id', backlog_item_id)

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true
    })
  } catch (error: any) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

// Get user votes for checking which items the user has voted on
export async function GET(request: NextRequest) {
  try {
    // Require authentication
    const session = getSessionFromRequest(request)
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized - Please log in' },
        { status: 401 }
      )
    }

    const supabase = createServerClient()

    // Use authenticated user's ID, not client-provided ID
    const user_id = session.userId

    const { data, error } = await supabase
      .from('backlog_votes')
      .select('backlog_item_id')
      .eq('user_id', user_id)

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      votes: (data || []).map((v: any) => v.backlog_item_id)
    })
  } catch (error: any) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
