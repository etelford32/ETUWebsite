import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabaseServer'
import { getSession } from '@/lib/session'
import { getClientInfo } from '@/lib/authEvents'
import { RateLimiters, getIdentifier } from '@/lib/ratelimit'

/**
 * POST /api/analytics/pageview — record a page view and bump the session's
 * page_views counter. Best-effort.
 */
export async function POST(request: NextRequest) {
  try {
    if (!RateLimiters.public(getIdentifier(request)).allowed) {
      return NextResponse.json({ ok: false }, { status: 429 })
    }

    const body = await request.json().catch(() => null)
    const sessionId = body?.session_id
    if (!sessionId) {
      return NextResponse.json({ ok: false, error: 'session_id required' }, { status: 400 })
    }

    const session = await getSession()
    const { ip } = getClientInfo(request)
    const supabase = createServerClient()

    await (supabase.from('analytics_events') as any).insert({
      session_id: sessionId,
      user_id: session?.userId ?? null,
      event_type: 'page_view',
      event_name: body.page_title || body.page_url || 'page_view',
      page_url: body.page_url ?? null,
      page_title: body.page_title ?? null,
      referrer: body.referrer ?? null,
      user_agent: body.user_agent ?? null,
      device_type: body.device_type ?? null,
      browser: body.browser ?? null,
      os: body.os ?? null,
      ip_address: ip,
    })

    // Bump the rolling page-view count + exit page on the session.
    await (supabase.rpc as any)('increment_session_pageview', {
      p_session_id: sessionId,
      p_exit_page: body.page_url ?? null,
    }).then(
      () => {},
      // Function is optional; ignore if not present.
      () => {}
    )

    return NextResponse.json({ ok: true })
  } catch (error: any) {
    console.error('analytics/pageview error:', error?.message || error)
    return NextResponse.json({ ok: false }, { status: 200 })
  }
}
