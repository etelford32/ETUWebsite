import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabaseServer'

const supabase = createServerClient()

// POST - Upvote feedback
export async function POST(request: NextRequest) {
  try {
    // Require authentication
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Missing authorization header' },
        { status: 401 }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid or expired authentication token' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { feedback_id } = body

    if (!feedback_id) {
      return NextResponse.json(
        { error: 'Missing feedback_id' },
        { status: 400 }
      )
    }

    // Check if user already voted
    const { data: existingVote } = await supabase
      .from('feedback_votes')
      .select('id')
      .eq('feedback_id', feedback_id)
      .eq('user_id', user.id)
      .single()

    if (existingVote) {
      return NextResponse.json(
        { error: 'You have already voted for this feedback' },
        { status: 409 }
      )
    }

    // Add vote
    const { data, error } = await supabase
      .from('feedback_votes')
      .insert({
        feedback_id,
        user_id: user.id,
      } as any)
      .select()
      .single()

    if (error) {
      console.error('Error adding vote:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Get updated vote count
    const { data: feedback } = await supabase
      .from('feedback')
      .select('vote_count')
      .eq('id', feedback_id)
      .single()

    return NextResponse.json({
      success: true,
      vote: data,
      vote_count: (feedback as any)?.vote_count || 0,
    })

  } catch (error: any) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE - Remove vote
export async function DELETE(request: NextRequest) {
  try {
    // Require authentication
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Missing authorization header' },
        { status: 401 }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid or expired authentication token' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const feedback_id = searchParams.get('feedback_id')

    if (!feedback_id) {
      return NextResponse.json(
        { error: 'Missing feedback_id' },
        { status: 400 }
      )
    }

    // Delete vote
    const { error } = await supabase
      .from('feedback_votes')
      .delete()
      .eq('feedback_id', feedback_id)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error removing vote:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Get updated vote count
    const { data: feedback } = await supabase
      .from('feedback')
      .select('vote_count')
      .eq('id', feedback_id)
      .single()

    return NextResponse.json({
      success: true,
      vote_count: (feedback as any)?.vote_count || 0,
    })

  } catch (error: any) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
