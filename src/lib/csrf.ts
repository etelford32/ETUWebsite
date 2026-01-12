import { randomBytes, timingSafeEqual } from 'crypto'
import { NextRequest } from 'next/server'
import { getSessionFromRequest } from './session'

const CSRF_TOKEN_LENGTH = 32
const CSRF_HEADER_NAME = 'x-csrf-token'

/**
 * Generate a cryptographically secure CSRF token
 */
export function generateCSRFToken(): string {
  return randomBytes(CSRF_TOKEN_LENGTH).toString('hex')
}

/**
 * Validate CSRF token using constant-time comparison
 * @param token - Token from request header
 * @param sessionToken - Token stored in session
 * @returns true if tokens match
 */
export function validateCSRFToken(token: string | null, sessionToken: string | null): boolean {
  if (!token || !sessionToken) {
    return false
  }

  // Tokens must be hex strings of correct length
  if (token.length !== CSRF_TOKEN_LENGTH * 2 || sessionToken.length !== CSRF_TOKEN_LENGTH * 2) {
    return false
  }

  // Use constant-time comparison to prevent timing attacks
  try {
    const tokenBuffer = Buffer.from(token, 'hex')
    const sessionTokenBuffer = Buffer.from(sessionToken, 'hex')

    return timingSafeEqual(tokenBuffer, sessionTokenBuffer)
  } catch {
    return false
  }
}

/**
 * Validate CSRF token from request
 * Checks the x-csrf-token header against the token stored in session
 *
 * @param request - Next.js request object
 * @returns true if CSRF token is valid
 */
export function validateCSRFFromRequest(request: NextRequest): boolean {
  const session = getSessionFromRequest(request)

  if (!session) {
    return false // No session = no valid CSRF
  }

  const csrfToken = request.headers.get(CSRF_HEADER_NAME)
  const sessionToken = (session as any).csrfToken

  return validateCSRFToken(csrfToken, sessionToken)
}

/**
 * Get CSRF token from request for logging/debugging
 */
export function getCSRFTokenFromRequest(request: NextRequest): string | null {
  return request.headers.get(CSRF_HEADER_NAME)
}
