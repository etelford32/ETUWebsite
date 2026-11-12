import { NextResponse } from 'next/server'
import { DISCORD_URL } from '@/lib/discord'

// Short, shareable link: exploretheuniverse2175.com/discord -> the Discord
// server. Temporary (307) so browsers don't cache the old target when
// DISCORD_URL changes. On-site links point at DISCORD_URL directly with a
// plain <a>, since next/link would try to prefetch this redirect.
export function GET() {
  return NextResponse.redirect(DISCORD_URL, 307)
}
