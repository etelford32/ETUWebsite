/**
 * TIER-01: roles, account tiers and who may change them.
 *
 * `profiles.tier` is a generated column (migration `tier01_account_tiers`):
 *
 *   dev     is_superuser, or role 'dev' / 'admin'
 *   alpha   is_alpha_tester, or role 'staff' / 'moderator'
 *   player  everyone else
 *
 * The tier decides which game build an account receives (through Steam
 * branches: player → the public demo, alpha → the password-protected alpha
 * branch, dev → the private dev branch). It never unlocks anything inside a
 * build. Promote someone by changing `role` or `is_alpha_tester` — the tier
 * follows; it is never written directly.
 *
 * Players cannot change any of these: `authenticated` may update only
 * avatar_url, display_name, faction_choice, is_public and newsletter. Every
 * change goes through a service-role admin route and is audited.
 */

export const ROLES = ['user', 'moderator', 'staff', 'dev', 'admin'] as const
export type Role = (typeof ROLES)[number]

/** Roles an admin may assign from /admin/users. `admin` stays superuser-only. */
export const ADMIN_ASSIGNABLE_ROLES: readonly Role[] = ['user', 'moderator', 'staff', 'dev']

export const TIERS = ['player', 'alpha', 'dev'] as const
export type Tier = (typeof TIERS)[number]

export function isRole(value: unknown): value is Role {
  return typeof value === 'string' && (ROLES as readonly string[]).includes(value)
}

/** Read a tier from the database, falling back to `player` for anything else. */
export function asTier(value: unknown): Tier {
  return typeof value === 'string' && (TIERS as readonly string[]).includes(value) ? (value as Tier) : 'player'
}

export const ROLE_COLORS: Record<Role, string> = {
  admin: 'bg-red-500/20 text-red-300 border-red-500/30',
  dev: 'bg-violet-500/20 text-violet-300 border-violet-500/30',
  staff: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
  moderator: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
  user: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
}

export const TIER_LABELS: Record<Tier, { label: string; hint: string; className: string }> = {
  dev: {
    label: 'Dev',
    hint: 'Receives the dev build (private dev branch)',
    className: 'bg-violet-500/20 text-violet-300 border-violet-500/30',
  },
  alpha: {
    label: 'Alpha',
    hint: 'Receives the alpha build (password-protected alpha branch)',
    className: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  },
  player: {
    label: 'Player',
    hint: 'Receives the public demo',
    className: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
  },
}
