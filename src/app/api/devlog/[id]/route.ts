import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabaseServer'
import { getSessionFromRequest } from '@/lib/session'

// PUT /api/devlog/[id] — admin only, update an entry
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
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

    const supabase = createServerClient()
    const { data, error } = await supabase
      .from('devlog_entries')
      .update({
        title: title.trim(),
        content: content.trim(),
        date: date || new Date().toISOString().split('T')[0],
        tags: Array.isArray(tags) ? tags : [],
        published: published !== false,
      })
      .eq('id', params.id)
      .select()
      .single()

    if (error) {
      console.error('PUT /api/devlog/[id] error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ entry: data })
  } catch (error: any) {
    console.error('PUT /api/devlog/[id] error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/devlog/[id] — admin only
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = getSessionFromRequest(request)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (session.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden — admin only' }, { status: 403 })
    }

    const supabase = createServerClient()
    const { error } = await supabase
      .from('devlog_entries')
      .delete()
      .eq('id', params.id)

    if (error) {
      console.error('DELETE /api/devlog/[id] error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('DELETE /api/devlog/[id] error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

// GET /api/devlog/[id] — public, returns a single entry
export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createServerClient()
    const { data, error } = await supabase
      .from('devlog_entries')
      .select('*')
      .eq('id', params.id)
      .eq('published', true)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    return NextResponse.json({ entry: data })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
