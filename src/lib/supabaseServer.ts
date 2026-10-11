import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/lib/types'

/**
 * Create a Supabase client with service role key for server-side operations
 * This should only be used in API routes and server components
 * NEVER expose this client to the browser
 */
export function createServerClient(): SupabaseClient<Database> {
  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl) {
    throw new Error('Missing environment variable: SUPABASE_URL')
  }

  if (!supabaseServiceKey) {
    throw new Error('Missing environment variable: SUPABASE_SERVICE_ROLE_KEY')
  }

  return createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

/**
 * Auth-only Supabase client for the server-side OAuth PKCE flow.
 *
 * supabase-js keeps the PKCE code verifier in its storage between
 * signInWithOAuth() and exchangeCodeForSession(). Those two calls happen in
 * different requests here, so the caller passes an in-memory store and
 * carries the verifier across in an HTTP-only cookie (see /api/auth/google).
 * Use this client for auth calls only — query data with createServerClient().
 */
export function createOAuthClient(store: Record<string, string>): SupabaseClient<Database> {
  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl) {
    throw new Error('Missing environment variable: SUPABASE_URL')
  }

  if (!supabaseServiceKey) {
    throw new Error('Missing environment variable: SUPABASE_SERVICE_ROLE_KEY')
  }

  return createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: {
      flowType: 'pkce',
      autoRefreshToken: false,
      detectSessionInUrl: false,
      // persistSession must be true or supabase-js ignores the custom storage
      persistSession: true,
      storageKey: OAUTH_STORAGE_KEY,
      storage: {
        getItem: (key) => store[key] ?? null,
        setItem: (key, value) => { store[key] = value },
        removeItem: (key) => { delete store[key] },
      },
    },
  })
}

const OAUTH_STORAGE_KEY = 'etu-oauth'
export const OAUTH_VERIFIER_KEY = `${OAUTH_STORAGE_KEY}-code-verifier`
