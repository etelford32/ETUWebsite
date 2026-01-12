import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from './supabaseServer'
import { generateCSRFToken } from './csrf'

const SESSION_COOKIE_NAME = 'etu_session'
const SESSION_MAX_AGE = 60 * 60 * 24 * 7 // 7 days

export interface SessionData {
  userId: string
  email: string
  role?: string
  csrfToken?: string
}

/**
 * Create a session cookie (HTTP-only, secure)
 */
export async function createSession(userId: string, email: string, role?: string): Promise<void> {
  const csrfToken = generateCSRFToken()
  const sessionData: SessionData = { userId, email, role, csrfToken }

  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE_NAME, JSON.stringify(sessionData), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict', // Changed from 'lax' to 'strict' for better security
    maxAge: SESSION_MAX_AGE,
    path: '/',
  })
}

/**
 * Get the current session from cookies (server-side only)
 */
export async function getSession(): Promise<SessionData | null> {
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)

    if (!sessionCookie?.value) {
      return null
    }

    const sessionData = JSON.parse(sessionCookie.value) as SessionData
    return sessionData
  } catch (error) {
    console.error('Error parsing session:', error)
    return null
  }
}

/**
 * Get session from NextRequest (for middleware and API routes)
 */
export function getSessionFromRequest(request: NextRequest): SessionData | null {
  try {
    const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)

    if (!sessionCookie?.value) {
      return null
    }

    const sessionData = JSON.parse(sessionCookie.value) as SessionData
    return sessionData
  } catch (error) {
    console.error('Error parsing session from request:', error)
    return null
  }
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
export function setSessionOnResponse(
  response: NextResponse,
  userId: string,
  email: string,
  role?: string
): void {
  const csrfToken = generateCSRFToken()
  const sessionData: SessionData = { userId, email, role, csrfToken }

  response.cookies.set(SESSION_COOKIE_NAME, JSON.stringify(sessionData), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict', // Changed from 'lax' to 'strict' for better security
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
