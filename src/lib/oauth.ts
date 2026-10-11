/** Cookies that carry Google OAuth state from /api/auth/google to /api/auth/callback. */
export const OAUTH_VERIFIER_COOKIE = 'etu_oauth_verifier'
export const OAUTH_NEXT_COOKIE = 'etu_oauth_next'

export const OAUTH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const, // must survive the top-level redirect back from Google
  maxAge: 60 * 10,
  path: '/api/auth',
}

/** Only allow same-site relative paths as post-login destinations. */
export function safeNextPath(value: string | null | undefined): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) {
    return '/dashboard'
  }
  return value
}
