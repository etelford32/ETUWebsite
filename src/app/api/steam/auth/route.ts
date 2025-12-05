import { NextRequest, NextResponse } from 'next/server'

// Steam OpenID authentication endpoint
// This initiates the Steam login flow

export async function GET(request: NextRequest) {
  const returnUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/steam/callback`

  const steamOpenIdUrl = 'https://steamcommunity.com/openid/login'

  const params = new URLSearchParams({
    'openid.ns': 'http://specs.openid.net/auth/2.0',
    'openid.mode': 'checkid_setup',
    'openid.return_to': returnUrl,
    'openid.realm': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
    'openid.identity': 'http://specs.openid.net/auth/2.0/identifier_select',
    'openid.claimed_id': 'http://specs.openid.net/auth/2.0/identifier_select',
  })

  return NextResponse.redirect(`${steamOpenIdUrl}?${params.toString()}`)
}
