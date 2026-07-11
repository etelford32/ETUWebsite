import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from './supabaseServer'
import { generateCSRFToken } from './csrf'
import { signSession, verifySessionToken } from './sessionToken'

const SESSION_COOKIE_NAME = 'etu_session'
const SESSION_MAX_AGE = 60 * 60 * 24 * 7 // 7 days

export interface SessionData {
  userId: string
  email: string
  role?: string
  csrfToken?: string
}

/**
 * Create a session cookie (HTTP-only, secure, HMAC-signed)
 */
export async function createSession(userId: string, email: string, role?: string): Promise<void> {
  const csrfToken = generateCSRFToken()
  const sessionData: SessionData = { userId, email, role, csrfToken }

  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE_NAME, await signSession(sessionData), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax', // lax allows cookies to be set when following external links (e.g. magic link from email)
    maxAge: SESSION_MAX_AGE,
    path: '/',
  })
}

/**
 * Get the current session from cookies (server-side only).
 * Returns null unless the cookie carries a valid HMAC signature.
 */
export async function getSession(): Promise<SessionData | null> {
  const cookieStore = await cookies()
  return verifySessionToken(cookieStore.get(SESSION_COOKIE_NAME)?.value)
}

/**
 * Get session from NextRequest (for API routes).
 * Returns null unless the cookie carries a valid HMAC signature.
 */
export async function getSessionFromRequest(request: NextRequest): Promise<SessionData | null> {
  return verifySessionToken(request.cookies.get(SESSION_COOKIE_NAME)?.value)
}

/**
 * Delete the session cookie
 */
export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE_NAME)
}

/**
 * Delete session from response (for API routes)
 */
export function deleteSessionFromResponse(response: NextResponse): void {
  response.cookies.delete(SESSION_COOKIE_NAME)
}

/**
 * Set session cookie on response (for API routes)
 */
export async function setSessionOnResponse(
  response: NextResponse,
  userId: string,
  email: string,
  role?: string
): Promise<void> {
  const csrfToken = generateCSRFToken()
  const sessionData: SessionData = { userId, email, role, csrfToken }

  response.cookies.set(SESSION_COOKIE_NAME, await signSession(sessionData), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax', // lax allows cookies to be set when following external links (e.g. magic link from email)
    maxAge: SESSION_MAX_AGE,
    path: '/',
  })
}

/**
 * Validate session and get user data from database
 */
export async function validateSession(sessionData: SessionData | null): Promise<{
  valid: boolean
  user?: any
}> {
  if (!sessionData) {
    return { valid: false }
  }

  try {
    const supabase = createServerClient()

    // Verify user still exists and get latest data
    const { data: user, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', sessionData.userId)
      .single()

    if (error || !user) {
      return { valid: false }
    }

    return { valid: true, user }
  } catch (error) {
    console.error('Error validating session:', error)
    return { valid: false }
  }
}

/**
 * Require authentication - throws error if not authenticated
 */
export async function requireAuth(): Promise<SessionData> {
  const session = await getSession()

  if (!session) {
    throw new Error('Unauthorized - Please log in')
  }

  return session
}

/**
 * Require admin role - throws error if not admin
 */
export async function requireAdmin(): Promise<SessionData> {
  const session = await requireAuth()

  if (session.role !== 'admin' && session.role !== 'staff') {
    throw new Error('Forbidden - Admin access required')
  }

  return session
}
