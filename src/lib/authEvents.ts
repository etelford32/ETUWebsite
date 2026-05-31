import { createServerClient } from './supabaseServer'

/**
 * Auth telemetry helper.
 *
 * Records authentication lifecycle events into public.auth_events. A database
 * trigger (apply_auth_event_to_profile) keeps the user-state columns on
 * profiles in sync, so callers only need to insert the raw event.
 *
 * Telemetry must NEVER break auth — every failure is swallowed and logged.
 */

export type AuthEventType =
  | 'signup'
  | 'login_success'
  | 'login_failed'
  | 'logout'
  | 'magic_link_requested'
  | 'magic_link_consumed'
  | 'password_reset_requested'
  | 'password_reset_completed'
  | 'invite_accepted'
  | 'email_verified'
  | 'session_refresh'

export type AuthMethod = 'password' | 'magic_link' | 'invite' | 'steam' | 'oauth'

/** Extract the client IP + user agent from an incoming request. */
export function getClientInfo(request: Request): { ip: string | null; userAgent: string | null } {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    request.headers.get('x-real-ip') ||
    request.headers.get('cf-connecting-ip') ||
    null
  const userAgent = request.headers.get('user-agent') || null
  return { ip, userAgent }
}

export interface RecordAuthEventOptions {
  eventType: AuthEventType
  request: Request
  userId?: string | null
  email?: string | null
  method?: AuthMethod
  metadata?: Record<string, any>
}

/**
 * Insert an auth event. Returns the inserted row id (or null on failure).
 * Never throws — auth flows call this on their happy AND error paths.
 */
export async function recordAuthEvent(opts: RecordAuthEventOptions): Promise<void> {
  try {
    const { ip, userAgent } = getClientInfo(opts.request)
    const supabase = createServerClient()

    await (supabase.from('auth_events') as any).insert({
      user_id: opts.userId ?? null,
      email: opts.email ? opts.email.toLowerCase() : null,
      event_type: opts.eventType,
      method: opts.method ?? null,
      ip_address: ip,
      user_agent: userAgent,
      metadata: opts.metadata ?? {},
    })
  } catch (err: any) {
    // Telemetry is best-effort and must not affect the auth response.
    console.error('recordAuthEvent failed:', err?.message || err)
  }
}
