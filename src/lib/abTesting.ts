import { supabase } from './supabaseClient'
import { getSessionId } from './analytics'

export interface ABVariant {
  id: string
  name: string
  description?: string
  config?: Record<string, any>
}

export interface ABExperiment {
  id: string
  name: string
  description?: string
  hypothesis?: string
  status: 'draft' | 'running' | 'paused' | 'completed' | 'archived'
  variants: ABVariant[]
  traffic_allocation: Record<string, number>
  start_date?: string
  end_date?: string
  primary_metric: string
  secondary_metrics?: string[]
}

export interface ABAssignment {
  experiment_id: string
  variant_id: string
  variant_name: string
}

// Cache for user's experiment assignments
const assignmentCache = new Map<string, ABAssignment>()

/**
 * Get or assign user to experiment variant
 */
export async function getExperimentVariant(
  experimentId: string
): Promise<ABAssignment | null> {
  if (typeof window === 'undefined') return null

  // Check cache first
  const cached = assignmentCache.get(experimentId)
  if (cached) return cached

  try {
    const { data: { user } } = await supabase.auth.getUser()
    const sessionId = getSessionId()

    const { data, error } = await supabase.rpc('assign_ab_variant', {
      p_experiment_id: experimentId,
      p_user_id: user?.id || null,
      p_session_id: sessionId,
    })

    if (error) throw error

    if (data && data.length > 0) {
      const assignment: ABAssignment = {
        experiment_id: experimentId,
        variant_id: data[0].variant_id,
        variant_name: data[0].variant_name,
      }

      assignmentCache.set(experimentId, assignment)
      return assignment
    }

    return null
  } catch (error) {
    console.error('Error getting experiment variant:', error)
    return null
  }
}

/**
 * Track conversion event for A/B test
 */
export async function trackConversion(
  experimentId: string,
  eventName: string,
  eventValue?: number
) {
  if (typeof window === 'undefined') return

  try {
    const assignment = await getExperimentVariant(experimentId)
    if (!assignment) return

    const { data: { user } } = await supabase.auth.getUser()
    const sessionId = getSessionId()

    // Get assignment ID
    const { data: assignmentData } = await supabase
      .from('ab_assignments')
      .select('id')
      .eq('experiment_id', experimentId)
      .eq('session_id', sessionId)
      .single()

    if (!assignmentData) return

    await supabase.from('ab_events').insert({
      experiment_id: experimentId,
      assignment_id: assignmentData.id,
      user_id: user?.id || null,
      session_id: sessionId,
      variant_id: assignment.variant_id,
      event_type: 'conversion',
      event_name: eventName,
      event_value: eventValue || null,
    })
  } catch (error) {
    console.error('Error tracking conversion:', error)
  }
}

/**
 * Track any custom event for A/B test
 */
export async function trackABEvent(
  experimentId: string,
  eventType: string,
  eventName: string,
  eventValue?: number,
  metadata?: Record<string, any>
) {
  if (typeof window === 'undefined') return

  try {
    const assignment = await getExperimentVariant(experimentId)
    if (!assignment) return

    const { data: { user } } = await supabase.auth.getUser()
    const sessionId = getSessionId()

    // Get assignment ID
    const { data: assignmentData } = await supabase
      .from('ab_assignments')
      .select('id')
      .eq('experiment_id', experimentId)
      .eq('session_id', sessionId)
      .single()

    if (!assignmentData) return

    await supabase.from('ab_events').insert({
      experiment_id: experimentId,
      assignment_id: assignmentData.id,
      user_id: user?.id || null,
      session_id: sessionId,
      variant_id: assignment.variant_id,
      event_type: eventType,
      event_name: eventName,
      event_value: eventValue || null,
      metadata: metadata || {},
    })
  } catch (error) {
    console.error('Error tracking AB event:', error)
  }
}

/**
 * Create a new A/B experiment
 */
export async function createExperiment(
  name: string,
  description: string,
  hypothesis: string,
  variants: ABVariant[],
  trafficAllocation: Record<string, number>,
  primaryMetric: string,
  secondaryMetrics?: string[]
): Promise<string | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser()

    const { data, error } = await supabase
      .from('ab_experiments')
      .insert({
        name,
        description,
        hypothesis,
        status: 'draft',
        variants,
        traffic_allocation: trafficAllocation,
        primary_metric: primaryMetric,
        secondary_metrics: secondaryMetrics || [],
        created_by: user?.id,
      })
      .select('id')
      .single()

    if (error) throw error

    return data.id
  } catch (error) {
    console.error('Error creating experiment:', error)
    return null
  }
}

/**
 * Start an experiment
 */
export async function startExperiment(experimentId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('ab_experiments')
      .update({
        status: 'running',
        start_date: new Date().toISOString(),
      })
      .eq('id', experimentId)

    if (error) throw error

    return true
  } catch (error) {
    console.error('Error starting experiment:', error)
    return false
  }
}

/**
 * Stop an experiment
 */
export async function stopExperiment(experimentId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('ab_experiments')
      .update({
        status: 'completed',
        end_date: new Date().toISOString(),
      })
      .eq('id', experimentId)

    if (error) throw error

    return true
  } catch (error) {
    console.error('Error stopping experiment:', error)
    return false
  }
}

/**
 * Get experiment results
 */
export async function getExperimentResults(experimentId: string) {
  try {
    const { data, error } = await supabase
      .from('ab_results')
      .select('*')
      .eq('experiment_id', experimentId)
      .order('variant_id')

    if (error) throw error

    return data || []
  } catch (error) {
    console.error('Error getting experiment results:', error)
    return []
  }
}

/**
 * React hook for using A/B test variant
 */
export function useABTest(experimentId: string) {
  const [variant, setVariant] = React.useState<ABAssignment | null>(null)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    getExperimentVariant(experimentId).then((assignment) => {
      setVariant(assignment)
      setLoading(false)
    })
  }, [experimentId])

  const trackConversionEvent = (eventName: string, value?: number) => {
    trackConversion(experimentId, eventName, value)
  }

  const trackEvent = (eventType: string, eventName: string, value?: number, metadata?: Record<string, any>) => {
    trackABEvent(experimentId, eventType, eventName, value, metadata)
  }

  return {
    variant,
    loading,
    isVariant: (variantId: string) => variant?.variant_id === variantId,
    trackConversion: trackConversionEvent,
    trackEvent,
  }
}

// Helper to add React import for the hook
import * as React from 'react'
