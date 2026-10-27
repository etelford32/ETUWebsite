import { createServerClient } from '@/lib/supabaseServer'
import type { SessionData } from '@/lib/session'

/**
 * Append one entry to admin_audit_log (service role only; RLS has no
 * policies, so nothing but the server can read or write it).
 *
 * A failed insert is logged and swallowed: the change it describes has
 * already been made, and refusing the response would only hide that.
 */
export async function writeAdminAudit(
  supabase: ReturnType<typeof createServerClient>,
  actor: SessionData,
  target: { id: string; email: string | null },
  action: string,
  details: Record<string, unknown>
): Promise<void> {
  const { error } = await (supabase.from('admin_audit_log') as any).insert({
    actor_id: actor.userId,
    actor_email: actor.email,
    target_id: target.id,
    target_email: target.email,
    action,
    details,
  })
  if (error) console.error('Audit log insert failed:', error)
}
