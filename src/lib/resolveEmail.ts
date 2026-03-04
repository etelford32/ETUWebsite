import { SupabaseClient } from '@supabase/supabase-js'

/**
 * Resolve a login identifier (email address OR commander username) to an email.
 * Used by login, magic-link, and forgot-password endpoints.
 *
 * - If the input contains '@' it is treated as an email and returned as-is.
 * - Otherwise it is looked up as a username in the profiles table.
 *
 * Returns the resolved email, or null if no matching account was found.
 */
export async function resolveEmailFromInput(
  emailOrUsername: string,
  supabase: SupabaseClient<any>
): Promise<string | null> {
  const trimmed = emailOrUsername.trim()

  if (trimmed.includes('@')) {
    return trimmed.toLowerCase()
  }

  // Look up by username (case-insensitive)
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id')
    .ilike('username', trimmed)
    .single()

  if (error || !profile) {
    return null
  }

  const { data: userData, error: userError } = await supabase.auth.admin.getUserById(profile.id)

  if (userError || !userData?.user?.email) {
    return null
  }

  return userData.user.email
}
