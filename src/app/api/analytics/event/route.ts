import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabaseServer'
import { getSession } from '@/lib/session'
import { getClientInfo } from '@/lib/authEvents'
import { RateLimiters, getIdentifier } from '@/lib/ratelimit'

/**
 * POST /api/analytics/event — record a custom interaction event. Best-effort.
 */
export async function POST(request: NextRequest) {
  try {
    if (!RateLimiters.public(getIdentifier(request)).allowed) {
      return NextResponse.json({ ok: false }, { status: 429 })
    }

    const body = await request.json().catch(() => null)
    const sessionId = body?.session_id
    if (!sessionId || !body?.event_name) {
      return NextResponse.json({ ok: false, error: 'session_id and event_name required' }, { status: 400 })
    }

    const session = await getSession()
    const { ip } = getClientInfo(request)
    const supabase = createServerClient()

    await (supabase.from('analytics_events') as any).insert({
      session_id: sessionId,
      user_id: session?.userId ?? null,
      event_type: body.event_type || 'custom',
      event_name: body.event_name,
      page_url: body.page_url ?? null,
      page_title: body.page_title ?? null,
      device_type: body.device_type ?? null,
      browser: body.browser ?? null,
      os: body.os ?? null,
      ip_address: ip,
      metadata: body.metadata ?? {},
    })

    await (supabase.rpc as any)('increment_session_events', { p_session_id: sessionId }).then(
      () => {},
      () => {}
    )

    return NextResponse.json({ ok: true })
  } catch (error: any) {
    console.error('analytics/event error:', error?.message || error)
    return NextResponse.json({ ok: false }, { status: 200 })
  }
}
