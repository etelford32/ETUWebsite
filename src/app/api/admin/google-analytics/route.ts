import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/session'
import { GAConfigError, getOverview, type GAOverview } from '@/lib/googleAnalytics'

const ALLOWED_DAYS = [7, 28, 90]
// GA quota is per property; admins refreshing the page shouldn't burn it.
const CACHE_MS = 5 * 60 * 1000
const cache = new Map<number, { at: number; data: GAOverview }>()

// GET /api/admin/google-analytics?days=28 — GA4 overview (admins only)
export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
  }

  const requested = parseInt(request.nextUrl.searchParams.get('days') || '28')
  const days = ALLOWED_DAYS.includes(requested) ? requested : 28
  const fresh = request.nextUrl.searchParams.get('refresh') === '1'

  const hit = cache.get(days)
  if (hit && !fresh && Date.now() - hit.at < CACHE_MS) {
    return NextResponse.json({ ...hit.data, cachedAt: new Date(hit.at).toISOString() })
  }

  try {
    const data = await getOverview(days)
    const at = Date.now()
    cache.set(days, { at, data })
    return NextResponse.json({ ...data, cachedAt: new Date(at).toISOString() })
  } catch (error: any) {
    if (error instanceof GAConfigError) {
      return NextResponse.json({ configured: false, error: error.message }, { status: 503 })
    }
    console.error('Google Analytics error:', error)
    return NextResponse.json({ error: error.message || 'Failed to load Google Analytics' }, { status: 502 })
  }
}
