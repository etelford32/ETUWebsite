import { supabase } from './supabaseClient'
import { getSessionId } from './analytics'

export interface FunnelStep {
  index: number
  name: string
  description?: string
  requiredAction: string
}

export interface Funnel {
  id: string
  name: string
  description?: string
  steps: FunnelStep[]
  is_active: boolean
}

/**
 * Track a user's progress through a funnel step
 */
export async function trackFunnelStep(
  funnelId: string,
  stepIndex: number,
  stepName: string,
  completed: boolean = false
) {
  if (typeof window === 'undefined') return

  try {
    const { data: { user } } = await supabase.auth.getUser()
    const sessionId = getSessionId()

    await supabase.rpc('track_funnel_step', {
      p_funnel_id: funnelId,
      p_user_id: user?.id || null,
      p_session_id: sessionId,
      p_step_index: stepIndex,
      p_step_name: stepName,
      p_completed: completed,
    })
  } catch (error) {
    console.error('Error tracking funnel step:', error)
  }
}

/**
 * Create a new funnel
 */
export async function createFunnel(
  name: string,
  description: string,
  steps: FunnelStep[]
): Promise<string | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser()

    const { data, error } = await supabase
      .from('funnels')
      .insert({
        name,
        description,
        steps,
        created_by: user?.id,
      })
      .select('id')
      .single()

    if (error) throw error

    return data.id
  } catch (error) {
    console.error('Error creating funnel:', error)
    return null
  }
}

/**
 * Get funnel statistics
 */
export async function getFunnelStats(funnelId: string, days: number = 7) {
  try {
    const { data, error } = await supabase.rpc('get_funnel_stats', {
      p_funnel_id: funnelId,
      days,
    })

    if (error) throw error

    return data
  } catch (error) {
    console.error('Error getting funnel stats:', error)
    return []
  }
}

/**
 * Get all active funnels
 */
export async function getActiveFunnels(): Promise<Funnel[]> {
  try {
    const { data, error } = await supabase
      .from('funnels')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error) throw error

    return data || []
  } catch (error) {
    console.error('Error getting funnels:', error)
    return []
  }
}

// Common funnel examples
export const COMMON_FUNNELS = {
  SIGNUP: {
    name: 'User Signup',
    description: 'Track user signup conversion',
    steps: [
      { index: 0, name: 'Visit Signup Page', description: 'User lands on signup page', requiredAction: 'page_view' },
      { index: 1, name: 'Fill Form', description: 'User fills signup form', requiredAction: 'form_fill' },
      { index: 2, name: 'Submit Form', description: 'User submits form', requiredAction: 'form_submit' },
      { index: 3, name: 'Email Verification', description: 'User verifies email', requiredAction: 'email_verify' },
      { index: 4, name: 'Complete Profile', description: 'User completes profile setup', requiredAction: 'profile_complete' },
    ],
  },
  GAME_START: {
    name: 'Game Start Flow',
    description: 'Track users starting a game',
    steps: [
      { index: 0, name: 'Visit Home', description: 'User visits homepage', requiredAction: 'page_view' },
      { index: 1, name: 'Click Play', description: 'User clicks play button', requiredAction: 'button_click' },
      { index: 2, name: 'Select Mode', description: 'User selects game mode', requiredAction: 'mode_select' },
      { index: 3, name: 'Start Game', description: 'Game actually starts', requiredAction: 'game_start' },
    ],
  },
  PURCHASE: {
    name: 'Purchase Flow',
    description: 'Track purchase conversion',
    steps: [
      { index: 0, name: 'View Item', description: 'User views item page', requiredAction: 'page_view' },
      { index: 1, name: 'Add to Cart', description: 'User adds item to cart', requiredAction: 'add_to_cart' },
      { index: 2, name: 'View Cart', description: 'User views cart', requiredAction: 'cart_view' },
      { index: 3, name: 'Checkout', description: 'User proceeds to checkout', requiredAction: 'checkout_start' },
      { index: 4, name: 'Payment', description: 'User completes payment', requiredAction: 'payment_complete' },
    ],
  },
}
