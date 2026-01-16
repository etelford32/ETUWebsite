import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://osvrbwvxnbpwsmgvdmkm.supabase.co"
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9zdnJid3Z4bmJwd3NtZ3ZkbWttIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0MjM4MTYsImV4cCI6MjA3NDk5OTgxNn0.1WS43PMFLACSXhR2TGDUEJb0VIIsQhcE3HaPBQra8sQ"

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      name,
      email,
      phone,
      company = null,
      investment_range,
      message,
      metadata = {}
    } = body

    // Basic validation
    if (!name || !email || !phone || !investment_range || !message) {
      return NextResponse.json(
        { error: 'Missing required fields: name, email, phone, investment_range, message' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Validate phone length
    if (phone.length < 10) {
      return NextResponse.json(
        { error: 'Phone number must be at least 10 characters' },
        { status: 400 }
      )
    }

    // Validate investment range
    const validRanges = [
      'Less than $50K',
      '$50K - $100K',
      '$100K - $500K',
      '$500K - $1M',
      '$1M - $5M',
      '$5M+',
      'Prefer not to say'
    ]
    if (!validRanges.includes(investment_range)) {
      return NextResponse.json(
        { error: 'Invalid investment range selected' },
        { status: 400 }
      )
    }

    // Validate message length
    if (message.length < 20) {
      return NextResponse.json(
        { error: 'Message must be at least 20 characters' },
        { status: 400 }
      )
    }

    // Insert investor inquiry
    const { data, error } = await supabase
      .from('investor_inquiries')
      .insert({
        name,
        email,
        phone,
        company,
        investment_range,
        message,
        metadata: {
          ...metadata,
          user_agent: request.headers.get('user-agent'),
          submitted_from: 'website',
          ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
        },
      })
      .select()
      .single()

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // TODO: Send email notification to admin
    // TODO: Send confirmation email to investor

    return NextResponse.json({
      success: true,
      message: 'Investment inquiry submitted successfully',
      inquiry_id: data.id,
    })
  } catch (error: any) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET endpoint to retrieve investor inquiries (admin only - requires authentication)
export async function GET(request: NextRequest) {
  try {
    // TODO: Add admin authentication check
    // For now, require a simple API key
    const apiKey = request.headers.get('x-api-key')
    if (!apiKey || apiKey !== process.env.ADMIN_API_KEY) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'pending'
    const investment_range = searchParams.get('investment_range')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    let query = supabase
      .from('investor_inquiries')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (status) {
      query = query.eq('status', status)
    }

    if (investment_range) {
      query = query.eq('investment_range', investment_range)
    }

    const { data, error, count } = await query

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      inquiries: data,
      total: count,
      limit,
      offset,
    })
  } catch (error: any) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
