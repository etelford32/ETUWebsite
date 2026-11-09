import type { NextResponse } from 'next/server'
import { SIGNUP_COOKIE, type SignUpMethod } from '@/lib/gtag'

/**
 * Flag a just-created account so the browser reports GA4's `sign_up` event
 * (see SignUpTracker). Accounts are created in API routes, where gtag does
 * not exist, so the method travels in a short-lived cookie that the client
 * reads once and clears. The cookie holds only the method name.
 */
export function markSignUpForAnalytics(response: NextResponse, method: SignUpMethod) {
  response.cookies.set(SIGNUP_COOKIE, method, {
    httpOnly: false, // read by client-side JS
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax', // survives the top-level redirect back from Google / Steam
    maxAge: 60 * 10,
    path: '/',
  })
}
