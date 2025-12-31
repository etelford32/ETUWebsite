import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabaseServer'

const supabase = createServerClient()

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { user_id, backlog_item_id } = body

    // Validation
    if (!user_id || !backlog_item_id) {
      return NextResponse.json(
        { error: 'Missing required fields: user_id, backlog_item_id' },
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
    const body = await request.json()
    const { user_id, backlog_item_id } = body

    // Validation
    if (!user_id || !backlog_item_id) {
      return NextResponse.json(
        { error: 'Missing required fields: user_id, backlog_item_id' },
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
    const { searchParams } = new URL(request.url)
    const user_id = searchParams.get('user_id')

    if (!user_id) {
      return NextResponse.json(
        { error: 'Missing required parameter: user_id' },
        { status: 400 }
      )
    }

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
