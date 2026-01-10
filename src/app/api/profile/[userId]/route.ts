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

    // Type assertion for profile data
    const profileData = profile as any

    // Check if user has permission to view this profile
    const isOwner = session?.userId === userId
    const isAdmin = session && ['admin', 'moderator'].includes(session.role || '')
    const isPublic = profileData.is_public

    // If profile is private and user is not owner or admin, return 403
    if (!isPublic && !isOwner && !isAdmin) {
      return NextResponse.json(
        { error: 'This profile is private' },
        { status: 403 }
      )
    }

    // Calculate derived stats
    const totalMatches = (profileData.total_wins || 0) + (profileData.total_losses || 0)
    const winRate = totalMatches > 0
      ? ((profileData.total_wins || 0) / totalMatches * 100).toFixed(1)
      : '0.0'
    const kdRatio = (profileData.total_deaths || 0) > 0
      ? ((profileData.total_kills || 0) / profileData.total_deaths).toFixed(2)
      : (profileData.total_kills || 0).toFixed(2)

    // Format playtime (seconds to hours)
    const playtimeHours = Math.floor((profileData.total_playtime || 0) / 3600)
    const playtimeMinutes = Math.floor(((profileData.total_playtime || 0) % 3600) / 60)

    // Build response with appropriate data based on access level
    const responseData = {
      id: profileData.id,
      username: profileData.username || 'Anonymous',
      avatar_url: profileData.avatar_url,
      faction_choice: profileData.faction_choice,
      created_at: profileData.created_at,
      level: profileData.level || 1,
      xp: profileData.xp || 0,

      // Stats
      stats: {
        total_kills: profileData.total_kills || 0,
        total_deaths: profileData.total_deaths || 0,
        total_wins: profileData.total_wins || 0,
        total_losses: profileData.total_losses || 0,
        total_matches: totalMatches,
        highest_score: profileData.highest_score || 0,
        total_playtime: profileData.total_playtime || 0,
        playtime_formatted: `${playtimeHours}h ${playtimeMinutes}m`,

        // Derived stats
        win_rate: winRate,
        kd_ratio: kdRatio,
      },

      // Privacy status
      is_public: profileData.is_public,

      // Meta info (only for owner or admin)
      meta: (isOwner || isAdmin) ? {
        role: profileData.role,
        ship_class: profileData.ship_class,
      } : undefined,

      // Access info
      access: {
        is_owner: isOwner,
        is_admin: isAdmin,
        can_edit: isOwner,
        can_view_private: isOwner || isAdmin,
      }
    }

    return NextResponse.json({ profile: responseData })
  } catch (error: any) {
    console.error('Error fetching profile:', error)
    return NextResponse.json(
      { error: 'Failed to fetch profile' },
      { status: 500 }
    )
  }
}
