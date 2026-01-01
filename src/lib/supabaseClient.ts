import { createClient } from '@supabase/supabase-js'

// Lazy singleton pattern - only create client when first accessed
let supabaseInstance: ReturnType<typeof createClient> | null = null

function getSupabaseClient() {
  if (supabaseInstance) {
    return supabaseInstance
  }

  // Validate required environment variables at runtime
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl) {
    throw new Error('Missing environment variable: NEXT_PUBLIC_SUPABASE_URL')
  }

  if (!supabaseAnonKey) {
    throw new Error('Missing environment variable: NEXT_PUBLIC_SUPABASE_ANON_KEY')
  }

  supabaseInstance = createClient(supabaseUrl, supabaseAnonKey)
  return supabaseInstance
}

// Export a getter that creates the client on-demand
export const supabase = new Proxy({} as ReturnType<typeof createClient>, {
  get(target, prop) {
    const client = getSupabaseClient()
    return (client as any)[prop]
  }
})

