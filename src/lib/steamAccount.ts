import { createServerClient } from './supabaseServer'

/**
 * One Supabase user per Steam ID (ACCOUNT-01).
 *
 * profiles.steam_id (unique) is the anchor. A player who first appears via
 * Steam gets a synthetic, never-mailed email so GoTrue can mint sessions for
 * them; steam_id and signup_method go in app_metadata, which only the
 * service role can write, and handle_new_user copies them onto the profile.
 */

const SYNTHETIC_EMAIL_DOMAIN = 'steam.players.exploretheuniverse2175.com'

export function syntheticSteamEmail(steamId: string): string {
  return `${steamId}@${SYNTHETIC_EMAIL_DOMAIN}`
}

export interface SteamAccount {
  userId: string
  email: string
  created: boolean
  status: string
}

async function findBySteamId(steamId: string): Promise<{ id: string; email: string | null; status: string } | null> {
  const supabase = createServerClient()
  const { data } = await (supabase.from('profiles') as any)
    .select('id, email, status')
    .eq('steam_id', steamId)
    .maybeSingle()
  return data ?? null
}

export async function findOrCreateSteamAccount(
  steamId: string,
  display: { personaName: string | null; avatarUrl: string | null }
): Promise<SteamAccount> {
  if (!/^\d{17}$/.test(steamId)) throw new Error('invalid steam id')

  const existing = await findBySteamId(steamId)
  if (existing) {
    return { userId: existing.id, email: await resolveEmail(existing), created: false, status: existing.status }
  }

  const supabase = createServerClient()
  const email = syntheticSteamEmail(steamId)
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    email_confirm: true,
    app_metadata: { steam_id: steamId, signup_method: 'steam_game' },
    user_metadata: {
      ...(display.personaName ? { persona_name: display.personaName } : {}),
      ...(display.avatarUrl ? { avatar_url: display.avatarUrl } : {}),
    },
  })

  if (error || !data?.user) {
    // A concurrent first login for the same Steam ID may have won the race.
    const raced = await findBySteamId(steamId)
    if (raced) {
      return { userId: raced.id, email: await resolveEmail(raced), created: false, status: raced.status }
    }
    throw new Error(`could not create steam account: ${error?.message || 'unknown error'}`)
  }

  return { userId: data.user.id, email, created: true, status: 'active' }
}

async function resolveEmail(profile: { id: string; email: string | null }): Promise<string> {
  // auth.users is the source of truth (a linked Google login may have
  // changed it); profiles.email is the fallback.
  const supabase = createServerClient()
  const { data } = await supabase.auth.admin.getUserById(profile.id)
  const email = data?.user?.email || profile.email
  if (!email) throw new Error('account has no email to mint a session for')
  return email
}

export interface MintedSession {
  accessToken: string
  refreshToken: string
  expiresAt: number | null
  expiresIn: number | null
}

/**
 * Mint a normal Supabase session for a user without sending any email:
 * generate a magic-link token server-side and immediately verify its hash.
 */
export async function mintSession(email: string): Promise<MintedSession> {
  const admin = createServerClient()
  const { data: link, error: linkError } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
  })
  const tokenHash = link?.properties?.hashed_token
  if (linkError || !tokenHash) {
    throw new Error(`generateLink failed: ${linkError?.message || 'no token'}`)
  }

  // A fresh client, so the verified session never lands on a shared one.
  const verifier = createServerClient()
  const { data, error } = await verifier.auth.verifyOtp({ type: 'magiclink', token_hash: tokenHash })
  const session = data?.session
  if (error || !session) {
    throw new Error(`verifyOtp failed: ${error?.message || 'no session'}`)
  }

  return {
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
    expiresAt: session.expires_at ?? null,
    expiresIn: session.expires_in ?? null,
  }
}
