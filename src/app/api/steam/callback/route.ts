import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabaseServer'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams

  // Verify the OpenID response
  const claimedId = searchParams.get('openid.claimed_id')

  if (!claimedId) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}/error?message=steam_auth_failed`)
  }

  // Extract Steam ID from claimed_id
  // Format: https://steamcommunity.com/openid/id/[STEAM_ID]
  const steamId = claimedId.split('/').pop()

  if (!steamId) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}/error?message=invalid_steam_id`)
  }

  try {
    // Fetch Steam profile data
    const steamApiKey = process.env.STEAM_WEB_API_KEY
    let steamProfile = null

    if (steamApiKey) {
      const steamResponse = await fetch(
        `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${steamApiKey}&steamids=${steamId}`
      )
      const steamData = await steamResponse.json()
      steamProfile = steamData.response?.players?.[0]
    }

    // Create or update Supabase profile
    const supabase = createServerClient()

    // Check if profile with this Steam ID exists
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('steam_id', steamId)
      .single()

    if (existingProfile) {
      // Update existing profile with latest Steam data
      await supabase
        .from('profiles')
        .update({
          username: steamProfile?.personaname || existingProfile.username,
          avatar_url: steamProfile?.avatarfull || existingProfile.avatar_url,
        })
        .eq('steam_id', steamId)

      // TODO: Create a session for this user
      // For now, redirect to sign in with instructions
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_SITE_URL}/?message=steam_linked&steam_id=${steamId}`
      )
    } else {
      // New Steam user - they need to create an account first or link to existing
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_SITE_URL}/?message=steam_new_user&steam_id=${steamId}&username=${steamProfile?.personaname || 'Commander'}`
      )
    }
  } catch (error) {
    console.error('Steam callback error:', error)
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}/error?message=steam_callback_error`)
  }
}
