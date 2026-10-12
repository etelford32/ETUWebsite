import type { createServerClient } from './supabaseServer'

// Applications arrive through two forms: the alpha-testing signup
// (alpha_applications) and the careers page (career_applications).
// These helpers merge both into one admin-facing shape.

export const APPLICATION_STATUSES = {
  alpha: ['pending', 'approved', 'rejected', 'accepted'],
  career: ['pending', 'reviewing', 'interviewed', 'accepted', 'rejected'],
} as const

export type ApplicationKind = keyof typeof APPLICATION_STATUSES

export interface AdminApplication {
  id: string
  kind: ApplicationKind
  name: string
  email: string
  headline: string
  summary: string
  status: string
  created_at: string
  details: Record<string, any>
}

export function fromAlpha(row: any): AdminApplication {
  const interests: string[] = row.interests || []
  return {
    id: row.id,
    kind: 'alpha',
    name: row.username,
    email: row.email,
    headline: `Alpha tester · ${row.experience || 'unknown'}${interests.length ? ` · ${interests.join(', ')}` : ''}`,
    summary: row.motivation || '',
    status: row.status,
    created_at: row.created_at,
    details: {
      Discord: row.discord,
      Interests: interests.join(', '),
      Experience: row.experience,
      Availability: row.availability,
      Motivation: row.motivation,
      'Game balancing interest': row.balancing_interest,
      'AI difficulty focus': row.ai_difficulty_feedback,
      'Bug testing experience': row.bug_testing_experience,
    },
  }
}

export function fromCareer(row: any): AdminApplication {
  return {
    id: row.id,
    kind: 'career',
    name: row.name,
    email: row.email,
    headline: `Career · ${row.position}`,
    summary: row.message || '',
    status: row.status,
    created_at: row.created_at,
    details: {
      Position: row.position,
      Portfolio: row.portfolio,
      Resume: row.resume_url,
      Message: row.message,
      Notes: row.notes,
    },
  }
}

/**
 * Fetch the newest applications of both kinds, merged newest-first.
 * A missing table (not yet migrated) yields an empty list, not an error.
 */
export async function fetchApplications(
  supabase: ReturnType<typeof createServerClient>,
  limit: number
): Promise<AdminApplication[]> {
  const [alpha, career] = await Promise.all([
    supabase.from('alpha_applications').select('*').order('created_at', { ascending: false }).limit(limit),
    supabase.from('career_applications').select('*').order('created_at', { ascending: false }).limit(limit),
  ])

  if (alpha.error) console.warn('alpha_applications query failed:', alpha.error.message)
  if (career.error) console.warn('career_applications query failed:', career.error.message)

  return [
    ...(alpha.data || []).map(fromAlpha),
    ...(career.data || []).map(fromCareer),
  ]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, limit)
}

