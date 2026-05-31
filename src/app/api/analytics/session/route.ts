import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabaseServer'
import { getSession } from '@/lib/session'
import { getClientInfo } from '@/lib/authEvents'
import { RateLimiters, getIdentifier } from '@/lib/ratelimit'

/**
 * POST /api/analytics/session — initialize (or upsert) a visitor session.
 * Best-effort: failures never surface to the client.
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
    const { ip, userAgent } = getClientInfo(request)
    const supabase = createServerClient()

    await (supabase.from('user_sessions') as any).upsert(
      {
        session_id: sessionId,
        user_id: session?.userId ?? null,
        entry_page: body.entry_page ?? null,
        referrer: body.referrer ?? null,
        utm_source: body.utm_source ?? null,
        utm_medium: body.utm_medium ?? null,
        utm_campaign: body.utm_campaign ?? null,
        device_type: body.device_type ?? null,
        browser: body.browser ?? null,
        os: body.os ?? null,
        ip_address: ip,
        metadata: { ...(body.metadata ?? {}), user_agent: userAgent },
      },
      { onConflict: 'session_id', ignoreDuplicates: true }
    )

    return NextResponse.json({ ok: true })
  } catch (error: any) {
    console.error('analytics/session error:', error?.message || error)
    return NextResponse.json({ ok: false }, { status: 200 })
  }
}
