import { NextRequest, NextResponse } from 'next/server'
import {
  EXPERIMENTS,
  EXP_COOKIE_MAX_AGE_SECONDS,
  cookieNameFor,
  defaultVariant,
  isValidVariant,
  pickVariant,
  type ExperimentId,
} from '@/lib/experiments'
// sessionToken is edge-safe (Web Crypto only) — do NOT import @/lib/session
// here; it pulls in Node-only crypto via ./csrf, which Edge cannot bundle.
import { verifySessionToken } from '@/lib/sessionToken'

const SESSION_COOKIE_NAME = 'etu_session'

// Pages that require a signed-in user (prefix match). Community pages
// (/backlog, /roadmap, /feedback, /ship-designer) handle logged-out
// visitors in their own page code and stay public — the homepage links
// to them, so gating them here would wall off marketing traffic.
const protectedRoutes = ['/dashboard', '/admin']

// '/profile' is gated as an exact match only: /profile/<id> are the
// public shareable profile pages.
const exactProtectedRoutes = ['/profile']

// Routes that are admin-only
const adminRoutes = ['/admin']

function assignExperimentCookies(request: NextRequest, response: NextResponse) {
  for (const id of Object.keys(EXPERIMENTS) as ExperimentId[]) {
    const exp = EXPERIMENTS[id]
    const name = cookieNameFor(id)
    const existing = request.cookies.get(name)?.value
    if (isValidVariant(exp, existing)) continue

    const variant = (() => {
      try {
        return pickVariant(exp, Math.random())
      } catch {
        return defaultVariant(exp)
      }
    })()

    response.cookies.set({
      name,
      value: variant,
      maxAge: EXP_COOKIE_MAX_AGE_SECONDS,
      path: '/',
      sameSite: 'lax',
    })
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Check if route requires authentication
  const isProtectedRoute =
    protectedRoutes.some((route) => pathname.startsWith(route)) ||
    exactProtectedRoutes.includes(pathname)
  const isAdminRoute = adminRoutes.some((route) => pathname.startsWith(route))

  if (!isProtectedRoute) {
    const response = NextResponse.next()
    assignExperimentCookies(request, response)
    return response
  }

  // Verify the signed session cookie — a forged/unsigned cookie reads as
  // logged out.
  const session = await verifySessionToken(
    request.cookies.get(SESSION_COOKIE_NAME)?.value
  )

  // If no session, redirect to login
  if (!session) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Check admin access for admin routes
  if (isAdminRoute) {
    if (session.role !== 'admin' && session.role !== 'staff') {
      // Redirect non-admins to dashboard
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  const response = NextResponse.next()
  assignExperimentCookies(request, response)
  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api routes (they do their own auth; no experiment cookies needed)
     * - _next/static, _next/image (static files)
     * - favicon.ico, robots.txt, sitemap.xml, manifest.json, sw.js
     *   (metadata files — Set-Cookie on these breaks CDN caching)
     * - static assets by extension
     */
    '/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|manifest.json|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|mp4)$).*)',
  ],
}
