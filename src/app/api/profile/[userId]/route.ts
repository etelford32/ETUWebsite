import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabaseServer'
import { getSessionFromRequest } from '@/lib/session'

/**
 * GET /api/profile/[userId]
 *
 * Fetch a user's public profile by ID
 *
 * Access Rules:
 * - Public profiles: accessible to everyone
 * - Private profiles: only accessible to the owner or admins/moderators
 * - Always returns basic info, but sensitive data is filtered based on privacy
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const { userId } = params

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(userId)) {
      return NextResponse.json(
        { error: 'Invalid user ID format' },
        { status: 400 }
      )
    }

    const supabase = createServerClient()
    const session = getSessionFromRequest(request)

    // Fetch the profile
    const { data: profile, error } = await supabase
      .from('profiles')
      .select(`
        id,
        username,
        avatar_url,
        faction_choice,
        created_at,
        level,
        xp,
        total_kills,
        total_deaths,
        total_wins,
        total_losses,
        total_playtime,
        highest_score,
        ship_class,
        is_public,
        role
      `)
      .eq('id', userId)
      .single()

    if (error || !profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      )
    }

    // Check if user has permission to view this profile
    const isOwner = session?.userId === userId
    const isAdmin = session && ['admin', 'moderator'].includes(session.role || '')
    const isPublic = profile.is_public

    // If profile is private and user is not owner or admin, return 403
    if (!isPublic && !isOwner && !isAdmin) {
      return NextResponse.json(
        { error: 'This profile is private' },
        { status: 403 }
      )
    }

    // Calculate derived stats
    const totalMatches = (profile.total_wins || 0) + (profile.total_losses || 0)
    const winRate = totalMatches > 0
      ? ((profile.total_wins || 0) / totalMatches * 100).toFixed(1)
      : '0.0'
    const kdRatio = (profile.total_deaths || 0) > 0
      ? ((profile.total_kills || 0) / profile.total_deaths).toFixed(2)
      : (profile.total_kills || 0).toFixed(2)

    // Format playtime (seconds to hours)
    const playtimeHours = Math.floor((profile.total_playtime || 0) / 3600)
    const playtimeMinutes = Math.floor(((profile.total_playtime || 0) % 3600) / 60)

    // Build response with appropriate data based on access level
    const profileData = {
      id: profile.id,
      username: profile.username || 'Anonymous',
      avatar_url: profile.avatar_url,
      faction_choice: profile.faction_choice,
      created_at: profile.created_at,
      level: profile.level || 1,
      xp: profile.xp || 0,

      // Stats
      stats: {
        total_kills: profile.total_kills || 0,
        total_deaths: profile.total_deaths || 0,
        total_wins: profile.total_wins || 0,
        total_losses: profile.total_losses || 0,
        total_matches: totalMatches,
        highest_score: profile.highest_score || 0,
        total_playtime: profile.total_playtime || 0,
        playtime_formatted: `${playtimeHours}h ${playtimeMinutes}m`,

        // Derived stats
        win_rate: winRate,
        kd_ratio: kdRatio,
      },

      // Privacy status
      is_public: profile.is_public,

      // Meta info (only for owner or admin)
      meta: (isOwner || isAdmin) ? {
        role: profile.role,
        ship_class: profile.ship_class,
      } : undefined,

      // Access info
      access: {
        is_owner: isOwner,
        is_admin: isAdmin,
        can_edit: isOwner,
        can_view_private: isOwner || isAdmin,
      }
    }

    return NextResponse.json({ profile: profileData })
  } catch (error: any) {
    console.error('Error fetching profile:', error)
    return NextResponse.json(
      { error: 'Failed to fetch profile' },
      { status: 500 }
    )
  }
}
