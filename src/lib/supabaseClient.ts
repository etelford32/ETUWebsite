/**
 * ⚠️ DEPRECATED: Client-side Supabase usage is DISABLED
 *
 * This file has been disabled to prevent exposing Supabase keys to the browser.
 * All Supabase operations must now go through server-side API routes.
 *
 * MIGRATION GUIDE:
 * ================
 *
 * ❌ OLD (Client-side - INSECURE):
 * ```typescript
 * import { supabase } from '@/lib/supabaseClient'
 * const { data } = await supabase.auth.getSession()
 * const { data } = await supabase.from('profiles').select('*')
 * ```
 *
 * ✅ NEW (Server-side API - SECURE):
 * ```typescript
 * // Check session
 * const res = await fetch('/api/auth/session')
 * const { authenticated, user } = await res.json()
 *
 * // Login
 * await fetch('/api/auth/login', {
 *   method: 'POST',
 *   body: JSON.stringify({ email, password })
 * })
 *
 * // Get profile
 * const res = await fetch('/api/profile')
 * const { profile } = await res.json()
 *
 * // Update profile
 * await fetch('/api/profile', {
 *   method: 'PATCH',
 *   body: JSON.stringify({ username: 'newname' })
 * })
 * ```
 *
 * AVAILABLE API ROUTES:
 * =====================
 * - POST /api/auth/login - Login with email/password
 * - POST /api/auth/signup - Create new account
 * - GET  /api/auth/session - Check if logged in
 * - POST /api/auth/logout - Logout
 * - GET  /api/profile - Get current user's profile
 * - PATCH /api/profile - Update current user's profile
 * - GET  /api/leaderboard - Get leaderboard data
 *
 * For server-side operations (API routes only), use:
 * @see /src/lib/supabaseServer.ts
 */

// Throw an error if anyone tries to use this
export const supabase = new Proxy({}, {
  get() {
    throw new Error(
      '❌ ERROR: Client-side Supabase usage is disabled!\n\n' +
      'Supabase keys must NOT be exposed to the browser.\n' +
      'Use server-side API routes instead:\n\n' +
      '  - POST /api/auth/login\n' +
      '  - POST /api/auth/signup\n' +
      '  - GET  /api/auth/session\n' +
      '  - POST /api/auth/logout\n' +
      '  - GET  /api/profile\n' +
      '  - PATCH /api/profile\n\n' +
      'See /src/lib/supabaseClient.ts for migration guide.'
    )
  }
})

