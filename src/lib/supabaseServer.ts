import { createClient } from '@supabase/supabase-js'
import { Database } from '@/lib/types'

/**
 * Create a Supabase client with secret key for server-side operations
 *
 * SECURITY CRITICAL:
 * - This should ONLY be used in API routes and server components
 * - NEVER expose this client or the secret key to the browser
 * - The secret key bypasses Row Level Security (RLS) policies
 * - Use this only when you need privileged access to the database
 *
 * For client-side operations, use supabaseClient.ts instead
 */
export function createServerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY

  if (!supabaseUrl) {
    throw new Error('Missing environment variable: NEXT_PUBLIC_SUPABASE_URL')
  }

  if (!supabaseSecretKey) {
    throw new Error('Missing environment variable: SUPABASE_SECRET_KEY')
  }

  // Validate that this is not running in the browser
  if (typeof window !== 'undefined') {
    throw new Error('SECURITY ERROR: Server client cannot be used in browser context!')
  }

  return createClient<Database>(supabaseUrl, supabaseSecretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}
