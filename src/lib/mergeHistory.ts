/**
 * Reading 'account_merge' rows of admin_audit_log (written by the
 * merge_steam_account() database function) for the admin consoles.
 * Client-safe: no server imports.
 */

export interface MergeDetails {
  source?: string
  steam_id?: string
  merged_user_id?: string
  merged_email?: string
  merged_username?: string | null
  access_changed?: boolean
  before?: {
    account?: { role?: string; tier?: string; is_superuser?: boolean; is_alpha_tester?: boolean; username?: string | null }
    merged_account?: {
      role?: string
      tier?: string
      is_superuser?: boolean
      is_alpha_tester?: boolean
      username?: string | null
      is_verified_owner?: boolean
    }
  }
  after?: { role?: string; tier?: string; is_superuser?: boolean; is_alpha_tester?: boolean; username?: string | null }
  moved?: { scores?: number; duplicate_scores_dropped?: number; ship_designs?: number; feedback?: number; votes?: number }
}

/** What access the merge changed, e.g. ["role staff → dev", "gained alpha access"]. */
export function mergeAccessChanges(details: MergeDetails | null | undefined): string[] {
  const before = details?.before?.account || {}
  const after = details?.after || {}
  const changes: string[] = []
  if (before.role && after.role && before.role !== after.role) changes.push(`role ${before.role} → ${after.role}`)
  if (!before.is_superuser && after.is_superuser) changes.push('gained superuser')
  if (!before.is_alpha_tester && after.is_alpha_tester) changes.push('gained alpha access')
  return changes
}

/** "merged Nova (Steam •••• 1234) into their account, 3 runs moved; role staff → dev". */
export function describeMerge(details: MergeDetails | null | undefined): string {
  const name = details?.merged_username || 'a Steam game account'
  const steam = typeof details?.steam_id === 'string' ? ` (Steam •••• ${details.steam_id.slice(-4)})` : ''
  const runs = details?.moved?.scores ?? 0
  const moved = runs ? `, ${runs} run${runs === 1 ? '' : 's'} moved` : ''
  const changes = mergeAccessChanges(details)
  return `merged ${name}${steam} into their account${moved}${changes.length ? `; ${changes.join(', ')}` : ''}`
}
