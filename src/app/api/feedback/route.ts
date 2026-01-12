import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabaseServer'
import { getSessionFromRequest } from '@/lib/session'
import { validateCSRFFromRequest } from '@/lib/csrf'

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient()

    // Check for session-based authentication
    const session = getSessionFromRequest(request)

    // If user is authenticated via session, validate CSRF token
    if (session) {
      if (!validateCSRFFromRequest(request)) {
        return NextResponse.json(
          { error: 'Invalid CSRF token' },
          { status: 403 }
        )
      }
    }

    // Check for authorization header (optional for anonymous game submissions)
    const authHeader = request.headers.get('authorization')
    let user = null

    // If auth header provided, verify the user
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '')
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token)

      if (!authError && authUser) {
        user = authUser
      }
    } else if (session) {
      // Use session user if no auth header
      user = { id: session.userId, email: session.email } as any
    }

    const body = await request.json()
    const {
      type,
      title,
      description,
      email,
      source = 'web',
      metadata = {},
    } = body

    // Validate required fields
    if (!type || !title || !description) {
      return NextResponse.json(
        { error: 'Missing required fields: type, title, description' },
        { status: 400 }
      )
    }

    // Validate type
    const validTypes = ['bug', 'feature', 'suggestion', 'support', 'other']
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: `Invalid type. Must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      )
    }

    // Validate title length
    if (title.length < 3 || title.length > 200) {
      return NextResponse.json(
        { error: 'Title must be between 3 and 200 characters' },
        { status: 400 }
      )
    }

    // Validate description length
    if (description.length < 10) {
      return NextResponse.json(
        { error: 'Description must be at least 10 characters' },
        { status: 400 }
      )
    }

    // Validate source
    const validSources = ['web', 'game']
    if (!validSources.includes(source)) {
      return NextResponse.json(
        { error: `Invalid source. Must be one of: ${validSources.join(', ')}` },
        { status: 400 }
      )
    }

    // Validate email format if provided
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Prepare metadata with request info
    const enhancedMetadata = {
      ...metadata,
      ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      user_agent: request.headers.get('user-agent') || 'unknown',
      submitted_via_api: true,
      timestamp: new Date().toISOString(),
    }

    // Insert feedback
    const { data, error } = await supabase
      .from('feedback')
      .insert({
        user_id: user?.id || null, // Can be null for anonymous submissions
        type,
        title: title.trim(),
        description: description.trim(),
        email: email?.trim() || null,
        source,
        status: 'open',
        priority: 'medium',
        metadata: enhancedMetadata,
      } as any)
      .select()
      .single()

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: 'Failed to create feedback' }, { status: 500 })
    }

    // Type assertion to help TypeScript understand data is not null
    const feedbackData = data as any

    return NextResponse.json({
      success: true,
      message: 'Feedback submitted successfully',
      feedback: {
        id: feedbackData.id,
        type: feedbackData.type,
        status: feedbackData.status,
        created_at: feedbackData.created_at,
      }
    }, { status: 201 })

  } catch (error: any) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET endpoint to retrieve user's feedback
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient()
    // Require authentication for viewing feedback
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

    // Get query parameters
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status') // Filter by status
    const type = searchParams.get('type') // Filter by type
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '20')

    // Build query
    let query = supabase
      .from('feedback')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    // Apply filters
    if (status) {
      query = query.eq('status', status)
    }
    if (type) {
      query = query.eq('type', type)
    }

    // Apply pagination
    const start = (page - 1) * pageSize
    query = query.range(start, start + pageSize - 1)

    const { data, error, count } = await query

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      data: data || [],
      total: count || 0,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize),
    })

  } catch (error: any) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
