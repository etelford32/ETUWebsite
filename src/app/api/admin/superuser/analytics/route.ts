import { NextRequest, NextResponse } from 'next/server'
import { requireSuperuser } from '@/lib/session'
import { getSiteAnalytics, PERIOD_KEYS, type PeriodKey } from '@/lib/superuserAnalytics'

const MAX_LOOKBACK_MS = 32 * 24 * 60 * 60 * 1000

/**
 * GET /api/admin/superuser/analytics?today=ISO&week=ISO&month=ISO&tz=Area/City
 *
 * The browser sends the start of its local day, week and month so the
 * periods match the viewer's calendar. Missing or out-of-range values fall
 * back to UTC boundaries.
 */
export async function GET(request: NextRequest) {
  try {
    await requireSuperuser(request)
  } catch (error: any) {
    const status = String(error?.message).startsWith('Unauthorized') ? 401 : 403
    return NextResponse.json({ error: error.message }, { status })
  }

  const params = request.nextUrl.searchParams
  const now = new Date()
  const utcDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  const fallback: Record<PeriodKey, Date> = {
    today: utcDay,
    week: new Date(utcDay.getTime() - ((utcDay.getUTCDay() + 6) % 7) * 86400000),
    month: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)),
  }

  const starts = {} as Record<PeriodKey, Date>
  for (const key of PERIOD_KEYS) {
    const parsed = new Date(params.get(key) || '')
    const ok = !isNaN(parsed.getTime()) && parsed <= now && now.getTime() - parsed.getTime() <= MAX_LOOKBACK_MS
    starts[key] = ok ? parsed : fallback[key]
  }

  let timeZone = params.get('tz') || 'UTC'
  try {
    new Intl.DateTimeFormat('en-CA', { timeZone })
  } catch {
    timeZone = 'UTC'
  }

  try {
    return NextResponse.json(await getSiteAnalytics(starts, timeZone))
  } catch (error: any) {
    console.error('Superuser analytics error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
