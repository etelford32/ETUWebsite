import { createServerClient } from './supabaseServer'
import { checkAppOwnership, getSteamConfig, type SteamOwnership } from './steamWebApi'

/**
 * Steam purchase verification (auth-flow.md §9).
 *
 * Asks ISteamUser/CheckAppOwnership whether a Steam ID owns the game and
 * records the answer on the player's profile. Needs STEAM_PUBLISHER_KEY;
 * without it every check reports `not_configured` and nothing is written.
 */

export type OwnershipOutcome =
  | { status: 'owned'; verifiedAt: string; checkedAt: string; familyShared: boolean }
  | { status: 'not_owned'; checkedAt: string }
  | { status: 'unavailable' }
  | { status: 'not_configured' }

/**
 * Write an ownership answer onto the profile. `null` (Steam didn't answer)
 * leaves the stored state alone. Returns the stored verified-at timestamp.
 */
export async function persistOwnership(
  userId: string,
  steamId: string,
  ownership: SteamOwnership | null
): Promise<OwnershipOutcome> {
  if (!ownership) return { status: 'unavailable' }

  const supabase = createServerClient()
  const now = new Date().toISOString()

  if (!ownership.ownsApp) {
    const { error } = await (supabase.from('profiles') as any)
      .update({ is_verified_owner: false, steam_purchase_verified_at: null, steam_ownership_checked_at: now })
      .eq('id', userId)
    if (error) console.error('persistOwnership (not owned) failed:', error)
    return { status: 'not_owned', checkedAt: now }
  }

  // Keep the first verification date; only set it when it's not there yet.
  const { data: current } = await (supabase.from('profiles') as any)
    .select('steam_purchase_verified_at')
    .eq('id', userId)
    .maybeSingle()
  const verifiedAt: string = current?.steam_purchase_verified_at || now

  const { error } = await (supabase.from('profiles') as any)
    .update({ is_verified_owner: true, steam_purchase_verified_at: verifiedAt, steam_ownership_checked_at: now })
    .eq('id', userId)
  if (error) console.error('persistOwnership (owned) failed:', error)

  return {
    status: 'owned',
    verifiedAt,
    checkedAt: now,
    // Family Sharing: the licence belongs to another Steam account.
    familyShared: ownership.ownerSteamId !== steamId,
  }
}

/** Ask Steam about `steamId` and record the answer for `userId`. */
export async function verifyOwnership(userId: string, steamId: string): Promise<OwnershipOutcome> {
  const config = getSteamConfig()
  if (!config) return { status: 'not_configured' }

  const ownership = await checkAppOwnership(config, steamId)
  return persistOwnership(userId, steamId, ownership)
}

/** Forget any verification; used when Steam is unlinked. */
export async function clearOwnership(userId: string): Promise<void> {
  const supabase = createServerClient()
  const { error } = await (supabase.from('profiles') as any)
    .update({ is_verified_owner: false, steam_purchase_verified_at: null, steam_ownership_checked_at: null })
    .eq('id', userId)
  if (error) console.error('clearOwnership failed:', error)
}
