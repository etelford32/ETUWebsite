import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Database } from '@/lib/types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://osvrbwvxnbpwsmgvdmkm.supabase.co"
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9zdnJid3Z4bmJwd3NtZ3ZkbWttIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0MjM4MTYsImV4cCI6MjA3NDk5OTgxNn0.1WS43PMFLACSXhR2TGDUEJb0VIIsQhcE3HaPBQra8sQ"

const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') // 'feature', 'bug', or null for all
    const status = searchParams.get('status') // 'open', 'in_progress', etc.
    const sortBy = searchParams.get('sortBy') || 'created_at' // 'created_at', 'vote_count', 'priority'
    const sortOrder = searchParams.get('sortOrder') || 'desc'
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '20')
    const search = searchParams.get('search')

    let query = supabase
      .from('backlog_items')
      .select(`
        *,
        profiles:user_id (
          id,
          username,
          avatar_url
        )
      `, { count: 'exact' })

    // Apply filters
    if (type) {
      query = query.eq('type', type)
    }
    if (status) {
      query = query.eq('status', status)
    }
    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`)
    }

    // Apply sorting
    const ascending = sortOrder === 'asc'
    query = query.order(sortBy as any, { ascending })

    // Apply pagination
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1
    query = query.range(from, to)

    const { data, error, count } = await query

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      items: data,
      pagination: {
        page,
        pageSize,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / pageSize)
      }
    })
  } catch (error: any) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      user_id,
      type,
      title,
      description,
      priority = 'medium',
      tags = [],
      source = 'web',
      metadata = {}
    } = body

    // Validation
    if (!user_id || !type || !title || !description) {
      return NextResponse.json(
        { error: 'Missing required fields: user_id, type, title, description' },
        { status: 400 }
      )
    }

    if (!['feature', 'bug'].includes(type)) {
      return NextResponse.json(
        { error: 'Type must be either "feature" or "bug"' },
        { status: 400 }
      )
    }

    if (title.length < 3 || title.length > 200) {
      return NextResponse.json(
        { error: 'Title must be between 3 and 200 characters' },
        { status: 400 }
      )
    }

    if (description.length < 10) {
      return NextResponse.json(
        { error: 'Description must be at least 10 characters' },
        { status: 400 }
      )
    }

    // Insert backlog item
    const { data, error } = await supabase
      .from('backlog_items')
      .insert({
        user_id,
        type,
        title: title.trim(),
        description: description.trim(),
        priority,
        tags,
        source,
        metadata,
        status: 'open',
        vote_count: 0
      } as any)
      .select(`
        *,
        profiles:user_id (
          id,
          username,
          avatar_url
        )
      `)
      .single()

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      item: data
    })
  } catch (error: any) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
