import { User } from '@supabase/supabase-js'
import { createServerClient } from './supabaseServer'
import { supabase as clientSupabase } from './supabaseClient'

export type UserRole = 'user' | 'admin' | 'moderator'

export interface ProfileWithRole {
  id: string
  role: UserRole
  username?: string
  avatar_url?: string
}

/**
 * Check if a user has admin role (server-side)
 * Use this in API routes
 */
export async function isAdmin(userId: string): Promise<boolean> {
  try {
    const supabase = createServerClient()
    const { data, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single()

    if (error || !data) {
      return false
    }

    return data.role === 'admin'
  } catch (error) {
    console.error('Error checking admin status:', error)
    return false
  }
}

/**
 * Check if a user has admin or moderator role (server-side)
 * Use this in API routes
 */
export async function isStaff(userId: string): Promise<boolean> {
  try {
    const supabase = createServerClient()
    const { data, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single()

    if (error || !data) {
      return false
    }

    return data.role === 'admin' || data.role === 'moderator'
  } catch (error) {
    console.error('Error checking staff status:', error)
    return false
  }
}

/**
 * Get user's profile with role (client-side)
 * Use this in React components
 */
export async function getUserRole(userId: string): Promise<UserRole> {
  try {
    const { data, error } = await clientSupabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single()

    if (error || !data) {
      return 'user'
    }

    return (data.role as UserRole) || 'user'
  } catch (error) {
    console.error('Error getting user role:', error)
    return 'user'
  }
}

/**
 * Require admin role in API route
 * Throws error if user is not admin
 */
export async function requireAdmin(userId: string): Promise<void> {
  const hasAdminRole = await isAdmin(userId)
  if (!hasAdminRole) {
    throw new Error('Forbidden: Admin access required')
  }
}

/**
 * Require staff role (admin or moderator) in API route
 * Throws error if user is not staff
 */
export async function requireStaff(userId: string): Promise<void> {
  const hasStaffRole = await isStaff(userId)
  if (!hasStaffRole) {
    throw new Error('Forbidden: Staff access required')
  }
}
