/**
 * Steam identity helpers that are safe to import from client components
 * (no Supabase, no Node APIs). Server-only logic lives in steamAccount.ts.
 */

export const STEAM_ID_PATTERN = /^\d{17}$/

/**
 * Players who first appear via Steam have no email, so GoTrue gets a
 * synthetic, never-mailed address on this domain (ACCOUNT-01).
 */
export const SYNTHETIC_STEAM_EMAIL_DOMAIN = 'steam.players.exploretheuniverse2175.com'

export function syntheticSteamEmail(steamId: string): string {
  return `${steamId}@${SYNTHETIC_STEAM_EMAIL_DOMAIN}`
}

export function isSyntheticSteamEmail(email: string | null | undefined): boolean {
  return !!email && email.toLowerCase().endsWith(`@${SYNTHETIC_STEAM_EMAIL_DOMAIN}`)
}

export function isValidSteamId(value: string | null | undefined): value is string {
  return typeof value === 'string' && STEAM_ID_PATTERN.test(value)
}

export function steamProfileUrl(steamId: string): string {
  return `https://steamcommunity.com/profiles/${steamId}`
}

/** "•••• 1234" — enough for a player to recognise their own account. */
export function maskSteamId(steamId: string): string {
  return `•••• ${steamId.slice(-4)}`
}
