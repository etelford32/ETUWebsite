import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabaseServer'

/**
 * Verify Steam OpenID 2.0 response signature
 * This prevents Steam ID spoofing attacks
 */
async function verifySteamOpenIDSignature(params: URLSearchParams): Promise<boolean> {
  try {
    // Build verification parameters
    const verifyParams = new URLSearchParams()

    // Copy all openid.* parameters
    params.forEach((value, key) => {
      if (key.startsWith('openid.')) {
        verifyParams.append(key, value)
      }
    })

    // Change mode to check_authentication
    verifyParams.set('openid.mode', 'check_authentication')

    // Send verification request to Steam
    const verifyResponse = await fetch('https://steamcommunity.com/openid/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: verifyParams.toString(),
    })

    const responseText = await verifyResponse.text()

    // Check if Steam confirms the signature is valid
    return responseText.includes('is_valid:true')
  } catch (error) {
    console.error('Steam OpenID verification error:', error)
    return false
  }
}

/**
 * Validate Steam ID format
 * Steam IDs are 17-digit numbers
 */
function isValidSteamId(steamId: string): boolean {
  return /^\d{17}$/.test(steamId)
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams

  // Check for required OpenID parameters
  const mode = searchParams.get('openid.mode')
  const claimedId = searchParams.get('openid.claimed_id')
  const identity = searchParams.get('openid.identity')

  // Validate OpenID mode
  if (mode !== 'id_res') {
    console.error('Invalid OpenID mode:', mode)
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}/error?message=steam_auth_invalid_mode`)
  }

  // Validate claimed_id and identity match
  if (!claimedId || !identity || claimedId !== identity) {
    console.error('Claimed ID and identity mismatch')
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}/error?message=steam_auth_failed`)
  }

  // Verify the claimed_id is from Steam
  if (!claimedId.startsWith('https://steamcommunity.com/openid/id/')) {
    console.error('Invalid claimed_id domain:', claimedId)
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}/error?message=steam_auth_invalid_domain`)
  }

  // Verify OpenID signature with Steam
  const isValid = await verifySteamOpenIDSignature(searchParams)
  if (!isValid) {
    console.error('Steam OpenID signature verification failed')
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}/error?message=steam_auth_signature_invalid`)
  }

  // Extract Steam ID from claimed_id
  // Format: https://steamcommunity.com/openid/id/[STEAM_ID]
  const steamId = claimedId.split('/').pop()

  if (!steamId || !isValidSteamId(steamId)) {
    console.error('Invalid Steam ID format:', steamId)
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
      const updateData = {
        username: steamProfile?.personaname || (existingProfile as any).username,
        avatar_url: steamProfile?.avatarfull || (existingProfile as any).avatar_url,
      }

      const { error: updateError } = await (supabase
        .from('profiles') as any)
        .update(updateData)
        .eq('steam_id', steamId)

      if (updateError) {
        console.error('Error updating profile:', updateError)
      }

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
