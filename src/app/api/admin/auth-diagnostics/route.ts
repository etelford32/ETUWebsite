import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest, validateSession } from '@/lib/session'
import { isAdmin } from '@/lib/adminAuth'

/**
 * GET /api/admin/auth-diagnostics
 *
 * Admin-only health check for the auth/email config that drives the magic-link
 * flow. Reports the resolved site origin, presence-only flags for sensitive
 * env vars (never the values), and the exact callback URL the magic-link
 * route would mint right now. Use this to sanity-check production env after
 * a deploy without needing to read Vercel's env-var store directly.
 *
 * Returns 401 / 403 to non-admins. Never returns secret values; only "is set"
 * booleans + non-secret derived URLs.
 */
export async function GET(request: NextRequest) {
  // Auth gate: must have a session AND be admin role.
  const session = getSessionFromRequest(request)
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }
  const { valid, user } = await validateSession(session)
  if (!valid || !user) {
    return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
  }
  if (!(await isAdmin(user.id))) {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  }

  // Resolve the base URL using the same logic the magic-link route uses,
  // so a mismatch here = a mismatch in production.
  const rawNextPublic = process.env.NEXT_PUBLIC_SITE_URL
  const rawVercel = process.env.VERCEL_URL
  let resolvedBase: string
  let resolvedSource: 'NEXT_PUBLIC_SITE_URL' | 'VERCEL_URL' | 'fallback'
  if (rawNextPublic) {
    resolvedBase = rawNextPublic.startsWith('http')
      ? rawNextPublic
      : `https://${rawNextPublic}`
    resolvedSource = 'NEXT_PUBLIC_SITE_URL'
  } else if (rawVercel) {
    resolvedBase = rawVercel.startsWith('http') ? rawVercel : `https://${rawVercel}`
    resolvedSource = 'VERCEL_URL'
  } else {
    resolvedBase = 'http://localhost:3000'
    resolvedSource = 'fallback'
  }

  // Build the exact callback URL pattern the magic-link route would mint.
  // The token_hash is replaced with <TOKEN_HASH> so this is safe to share.
  const callbackUrlTemplate =
    `${resolvedBase}/api/auth/magic-link/callback` +
    `?token_hash=<TOKEN_HASH>` +
    `&type=magiclink` +
    `&redirect=%2Fdashboard`

  return NextResponse.json({
    runtime: {
      nodeEnv: process.env.NODE_ENV ?? 'unknown',
      now: new Date().toISOString(),
    },
    siteUrl: {
      resolved: resolvedBase,
      source: resolvedSource,
      // Echo the raw values too — these aren't secret. Useful to spot
      // typos like missing https:// or trailing slashes.
      raw: {
        NEXT_PUBLIC_SITE_URL: rawNextPublic ?? null,
        VERCEL_URL: rawVercel ?? null,
      },
    },
    // Presence-only. Booleans, no values. Catches "env var missing in prod"
    // without ever exposing a key in a response body.
    envPresent: {
      // Server-side
      SUPABASE_URL: !!process.env.SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      SESSION_SECRET: !!process.env.SESSION_SECRET,
      RESEND_API_KEY: !!process.env.RESEND_API_KEY,
      RUN_TOKEN_SECRET: !!process.env.RUN_TOKEN_SECRET,
      STEAM_WEB_API_KEY: !!process.env.STEAM_WEB_API_KEY,
      DISCORD_WEBHOOK_URL: !!process.env.DISCORD_WEBHOOK_URL,
      CRON_SECRET: !!process.env.CRON_SECRET,
      // Client-exposed (also appear server-side)
      NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    },
    magicLink: {
      callbackUrlTemplate,
      // The Supabase project ID this deploy is talking to (harmless to
      // share — it's in the Supabase URL itself). Cross-check against the
      // project's allowlist in Supabase Dashboard → Auth → URL Configuration.
      supabaseProjectRef:
        process.env.SUPABASE_URL?.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] ??
        null,
      // What the user should ensure is in the Supabase redirect-URL
      // allowlist. If this isn't there, admin.generateLink will refuse to
      // mint links pointed at our callback.
      requiredAllowlistEntry: `${resolvedBase}/api/auth/magic-link/callback`,
      // Resend is the email transport; without it the magic-link route
      // returns success without sending an email (or returns debugLink in
      // development). If false, magic links don't reach inboxes.
      resendConfigured: !!process.env.RESEND_API_KEY,
    },
  })
}
