import { createHmac, timingSafeEqual } from 'crypto'
import { createServerClient } from './supabaseServer'
import { getSessionSecret } from './sessionToken'
import { isSyntheticSteamEmail, isValidSteamId } from './steamIdentity'

/**
 * Steam account merge (auth-flow.md §9).
 *
 * A player who signed in from the game first has a Steam-only account
 * (synthetic email). When they try to link that Steam ID to their email
 * account, /api/steam/callback can't attach it (profiles.steam_id is unique)
 * but it has just proved, with a Steam-signed OpenID assertion, that this
 * browser controls the Steam ID that signs in to the other account. It
 * records that proof in a short-lived signed cookie (the merge offer), and
 * POST /api/steam/merge redeems it to fold the Steam-only account into the
 * signed-in one.
 */

export const STEAM_MERGE_COOKIE = 'etu_steam_merge'
const OFFER_TTL_SECONDS = 60 * 10
export const STEAM_MERGE_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const, // set on the redirect back from Steam
  maxAge: OFFER_TTL_SECONDS,
  path: '/api/steam',
}

export interface MergeOffer {
  /** The signed-in account that will keep everything. */
  targetUserId: string
  /** The Steam-only account that will be folded into it. */
  sourceUserId: string
  steamId: string
  /** Unix seconds. */
  exp: number
}

const PURPOSE = 'steam-merge-v1'

function mac(payload: string): Buffer {
  return createHmac('sha256', getSessionSecret()).update(`${PURPOSE}.${payload}`).digest()
}

export function signMergeOffer(offer: Omit<MergeOffer, 'exp'>): string {
  const full: MergeOffer = { ...offer, exp: Math.floor(Date.now() / 1000) + OFFER_TTL_SECONDS }
  const payload = Buffer.from(JSON.stringify(full), 'utf8').toString('base64url')
  return `${payload}.${mac(payload).toString('base64url')}`
}

/** The offer, if the cookie is genuine, unexpired and for this user. */
export function readMergeOffer(value: string | undefined | null, userId: string): MergeOffer | null {
  if (!value) return null
  const dot = value.indexOf('.')
  if (dot <= 0) return null
  const payload = value.slice(0, dot)
  const given = Buffer.from(value.slice(dot + 1), 'base64url')
  const expected = mac(payload)
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null
  try {
    const offer = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as MergeOffer
    if (
      typeof offer?.targetUserId !== 'string' ||
      typeof offer.sourceUserId !== 'string' ||
      !isValidSteamId(offer.steamId) ||
      typeof offer.exp !== 'number' ||
      offer.exp < Date.now() / 1000 ||
      offer.targetUserId !== userId
    ) {
      return null
    }
    return offer
  } catch {
    return null
  }
}

export interface MergeCandidate {
  id: string
  status: string
  steamOnly: boolean
}

/** The account holding `steamId`, and whether it can be merged away. */
export async function findSteamHolder(steamId: string): Promise<MergeCandidate | null> {
  const supabase = createServerClient()
  const { data: holder } = await (supabase.from('profiles') as any)
    .select('id, email, status')
    .eq('steam_id', steamId)
    .maybeSingle()
  if (!holder) return null

  // auth.users is the source of truth for the email (a later Google login
  // or support change may have given the account a real one).
  const { data: authUser } = await supabase.auth.admin.getUserById(holder.id)
  const email = authUser?.user?.email ?? holder.email
  return {
    id: holder.id,
    status: holder.status || 'active',
    steamOnly: isSyntheticSteamEmail(email),
  }
}

export interface MergePreview {
  username: string | null
  displayName: string | null
  avatarUrl: string | null
  level: number | null
  highestScore: number | null
  scores: number
  shipDesigns: number
  isVerifiedOwner: boolean
  createdAt: string | null
}

/** What the player will bring across, for the confirmation prompt. */
export async function previewSteamAccount(userId: string): Promise<MergePreview | null> {
  const supabase = createServerClient()
  const { data: p } = await (supabase.from('profiles') as any)
    .select('username, display_name, avatar_url, level, highest_score, is_verified_owner, created_at')
    .eq('id', userId)
    .maybeSingle()
  if (!p) return null

  const [scores, designs] = await Promise.all([
    (supabase.from('player_scores') as any).select('id', { count: 'exact', head: true }).eq('user_id', userId),
    (supabase.from('ship_designs') as any).select('id', { count: 'exact', head: true }).eq('user_id', userId),
  ])

  return {
    username: p.username ?? null,
    displayName: p.display_name ?? null,
    avatarUrl: p.avatar_url ?? null,
    level: p.level ?? null,
    highestScore: p.highest_score ?? null,
    scores: scores.count ?? 0,
    shipDesigns: designs.count ?? 0,
    isVerifiedOwner: p.is_verified_owner === true,
    createdAt: p.created_at ?? null,
  }
}
