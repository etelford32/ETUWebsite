import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/session'
import {
  EXPERIMENTS,
  EXP_COOKIE_MAX_AGE_SECONDS,
  cookieNameFor,
  defaultVariant,
  isValidVariant,
  pickVariant,
  type ExperimentId,
} from '@/lib/experiments'

// Routes that require authentication
const protectedRoutes = [
  '/dashboard',
  '/profile',
  '/ship-designer',
  '/admin',
  '/feedback',
  '/backlog',
  '/roadmap',
  '/alpha-testing',
]

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

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Check if route requires authentication
  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  )
  const isAdminRoute = adminRoutes.some((route) => pathname.startsWith(route))

  if (!isProtectedRoute) {
    const response = NextResponse.next()
    assignExperimentCookies(request, response)
    return response
  }

  // Get session from cookie
  const session = getSessionFromRequest(request)

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
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     * - api routes (handled separately)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|mp4)$).*)',
  ],
}
