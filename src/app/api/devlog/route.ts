import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabaseServer'
import { getSessionFromRequest } from '@/lib/session'

// Use untyped client to avoid Database type resolution issues for new tables
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = () => createServerClient() as any

// GET /api/devlog — public, returns all published entries ordered by date desc
export async function GET() {
  try {
    const { data, error } = await db()
      .from('devlog_entries')
      .select('id, title, content, date, tags, published, created_at, updated_at')
      .eq('published', true)
      .order('date', { ascending: false })

    if (error) {
      // Table may not exist yet — return empty so page falls back to seed data
      console.warn('devlog_entries fetch error (table may not exist yet):', error.message)
      return NextResponse.json({ entries: [] })
    }

    return NextResponse.json({ entries: data || [] })
  } catch (error: any) {
    console.error('GET /api/devlog error:', error)
    return NextResponse.json({ entries: [] })
  }
}

// POST /api/devlog — admin only, create a new entry
export async function POST(request: NextRequest) {
  try {
    const session = getSessionFromRequest(request)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (session.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden — admin only' }, { status: 403 })
    }

    const body = await request.json()
    const { title, content, date, tags, published } = body

    if (!title?.trim() || !content?.trim()) {
      return NextResponse.json({ error: 'title and content are required' }, { status: 400 })
    }

    const { data, error } = await db()
      .from('devlog_entries')
      .insert({
        title: title.trim(),
        content: content.trim(),
        date: date || new Date().toISOString().split('T')[0],
        tags: Array.isArray(tags) ? tags : [],
        published: published !== false,
      })
      .select()
      .single()

    if (error) {
      console.error('POST /api/devlog insert error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ entry: data }, { status: 201 })
  } catch (error: any) {
    console.error('POST /api/devlog error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
