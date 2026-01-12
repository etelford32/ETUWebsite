import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabaseServer'


export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient()
    const searchParams = request.nextUrl.searchParams
    const mode = searchParams.get('mode') || 'global'
    const windowKey = searchParams.get('window') || '30d'
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '50')
    const sortFieldParam = searchParams.get('sortField') || 'score'
    const sortDir = searchParams.get('sortDir') || 'desc'

    // Whitelist valid sort fields to prevent SQL injection
    const validSortFields = ['score', 'submitted_at', 'level', 'time_seconds']
    const sortField = validSortFields.includes(sortFieldParam) ? sortFieldParam : 'score'

    // Validate sort direction
    const validSortDir = sortDir === 'asc' ? 'asc' : 'desc'

    // Calculate time window
    const now = new Date()
    let cutoffDate = new Date(0) // Default: all time

    switch (windowKey) {
      case 'today':
        cutoffDate = new Date(now.getTime() - 24 * 60 * 60 * 1000)
        break
      case '7d':
        cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case '30d':
        cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
      case '90d':
        cutoffDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
        break
    }

    // Build query
    let query = supabase
      .from('player_scores')
      .select(`
        *,
        profile:profiles(*)
      `, { count: 'exact' })
      .gte('submitted_at', cutoffDate.toISOString())
      .eq('is_verified', true)

    // Apply sorting (already validated sortField and validSortDir)
    query = query.order(sortField as any, { ascending: validSortDir === 'asc' })

    // Apply pagination
    const start = (page - 1) * pageSize
    query = query.range(start, start + pageSize - 1)

    const { data, error, count } = await query

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Add ranks
    const dataWithRanks = (data || []).map((entry, idx) => ({
      ...entry as any,
      rank: start + idx + 1
    }))

    return NextResponse.json({
      data: dataWithRanks,
      total: count || 0,
      page,
      pageSize,
    })
  } catch (error: any) {
    console.error('API error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
