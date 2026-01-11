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
