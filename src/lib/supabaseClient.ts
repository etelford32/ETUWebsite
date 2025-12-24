import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://osvrbwvxnbpwsmgvdmkm.supabase.co"
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9zdnJid3Z4bmJwd3NtZ3ZkbWttIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0MjM4MTYsImV4cCI6MjA3NDk5OTgxNn0.1WS43PMFLACSXhR2TGDUEJb0VIIsQhcE3HaPBQra8sQ"

// Export without Database generic to avoid type inference issues
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

