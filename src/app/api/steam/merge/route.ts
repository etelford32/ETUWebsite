import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabaseServer'
import { getSessionFromRequest } from '@/lib/session'
import { validateCSRFFromRequest } from '@/lib/csrf'
import { checkRateLimit } from '@/lib/ratelimit'
import { recordAuthEvent } from '@/lib/authEvents'
import { verifyOwnership } from '@/lib/steamOwnership'
import {
  STEAM_MERGE_COOKIE,
  STEAM_MERGE_COOKIE_OPTIONS,
  findSteamHolder,
  previewSteamAccount,
  readMergeOffer,
} from '@/lib/steamMerge'

export const dynamic = 'force-dynamic'

/**
 * /api/steam/merge - Fold a Steam-only account into the signed-in one.
 *
 * Reached after "Link Steam" found the Steam ID already on a Steam-only
 * account (the player signed in from the game before making an email
 * account). /api/steam/callback left a signed, 10-minute merge offer cookie
 * proving this browser just authenticated as that Steam ID.
 *
 *   GET     what the Steam account holds, for the confirmation prompt
 *   POST    merge it (session + CSRF + offer); the Steam ID, scores, ship
 *           designs, feedback and game totals move here, the higher of the
 *           two accounts' access is kept, the merge is recorded in
 *           admin_audit_log (shown in the superuser console and
 *           /admin/users), and the Steam-only account is deleted
 *   DELETE  decline the offer
 */

const NO_STORE = { 'Cache-Control': 'no-store' }

function json(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, { status, headers: NO_STORE })
}

function clearOffer(response: NextResponse): NextResponse {
  response.cookies.set(STEAM_MERGE_COOKIE, '', { ...STEAM_MERGE_COOKIE_OPTIONS, maxAge: 0 })
  return response
}

/** Errors merge_steam_account raises, as the player should read them. */
const MERGE_ERRORS: Record<string, { status: number; message: string }> = {
  merge_target_has_steam: { status: 409, message: 'This account already has a Steam account linked.' },
  merge_steam_mismatch: { status: 409, message: 'That Steam account has changed since you signed in with Steam. Please link again.' },
  merge_account_missing: { status: 404, message: 'The Steam account no longer exists. Try linking Steam again.' },
  merge_account_inactive: { status: 409, message: "One of these accounts is suspended, so they can't be merged. Contact support." },
  merge_source_not_steam_only: {
    status: 409,
    message: 'That Steam account has its own email sign-in. Sign in to it with Steam and unlink Steam there first.',
  },
}

async function loadOffer(request: NextRequest) {
  const session = await getSessionFromRequest(request)
  if (!session) return { session: null, offer: null }
  const offer = readMergeOffer(request.cookies.get(STEAM_MERGE_COOKIE)?.value, session.userId)
  return { session, offer }
}

export async function GET(request: NextRequest) {
  const { session, offer } = await loadOffer(request)
  if (!session) return json({ error: 'unauthorized' }, 401)
  if (!offer) return clearOffer(json({ error: 'no_offer' }, 404))

  const preview = await previewSteamAccount(offer.sourceUserId)
  if (!preview) return clearOffer(json({ error: 'no_offer' }, 404))

  const supabase = createServerClient()
  const { data: me } = await (supabase.from('profiles') as any)
    .select('username')
    .eq('id', session.userId)
    .maybeSingle()

  return json({
    steam_account: preview,
    current_username: me?.username ?? null,
    expires_at: new Date(offer.exp * 1000).toISOString(),
  })
}

export async function DELETE(request: NextRequest) {
  const session = await getSessionFromRequest(request)
  if (!session) return json({ error: 'unauthorized' }, 401)
  if (!(await validateCSRFFromRequest(request))) return json({ error: 'Invalid CSRF token' }, 403)
  return clearOffer(json({ success: true }))
}

export async function POST(request: NextRequest) {
  try {
    const { session, offer } = await loadOffer(request)
    if (!session) return json({ error: 'unauthorized', message: 'Please sign in again.' }, 401)
    if (!(await validateCSRFFromRequest(request))) return json({ error: 'Invalid CSRF token' }, 403)
    if (!offer) {
      return clearOffer(
        json({ error: 'no_offer', message: 'The merge request expired. Link Steam again to restart it.' }, 410)
      )
    }

    const limit = checkRateLimit(`steam-merge:${session.userId}`, 5, 10 * 60 * 1000)
    if (!limit.allowed) {
      return json({ error: 'rate_limited', message: 'Please wait a few minutes and try again.' }, 429)
    }

    // Re-check right before merging: the offer is a few minutes old.
    const holder = await findSteamHolder(offer.steamId)
    if (!holder || holder.id !== offer.sourceUserId) {
      return clearOffer(json({ error: 'merge_steam_mismatch', message: MERGE_ERRORS.merge_steam_mismatch.message }, 409))
    }
    if (!holder.steamOnly) {
      return clearOffer(
        json({ error: 'merge_source_not_steam_only', message: MERGE_ERRORS.merge_source_not_steam_only.message }, 409)
      )
    }

    const supabase = createServerClient()
    const { data: result, error } = await (supabase as any).rpc('merge_steam_account', {
      p_source: offer.sourceUserId,
      p_target: session.userId,
      p_steam_id: offer.steamId,
    })
    if (error) {
      const known = Object.keys(MERGE_ERRORS).find((code) => error.message?.includes(code))
      if (known) {
        return clearOffer(json({ error: known, message: MERGE_ERRORS[known].message }, MERGE_ERRORS[known].status))
      }
      console.error('Steam merge failed:', error)
      return json({ error: 'server_error', message: 'Something went wrong on our side. Please try again.' }, 500)
    }

    // The database is consistent from here on; the rest is cleanup.
    const { error: metaError } = await supabase.auth.admin.updateUserById(session.userId, {
      app_metadata: { steam_id: offer.steamId },
    })
    if (metaError) console.error('Steam merge app_metadata update failed:', metaError)

    // The Steam-only account is now an empty shell (status 'deleted', no
    // Steam ID). Removing its auth user also ends any game session on it;
    // the game's next Steam sign-in resolves to this account.
    const { error: deleteError } = await supabase.auth.admin.deleteUser(offer.sourceUserId)
    if (deleteError) {
      console.error(`Steam merge: could not delete merged account ${offer.sourceUserId}:`, deleteError)
    }

    await verifyOwnership(session.userId, offer.steamId).catch((err) =>
      console.error('Steam ownership check after merge failed:', err)
    )

    await recordAuthEvent({
      eventType: 'account_merged',
      request,
      userId: session.userId,
      method: 'steam',
      metadata: { merged_user_id: offer.sourceUserId, ...(result ?? {}) },
    })

    return clearOffer(json({ success: true, merged: result ?? {} }))
  } catch (error) {
    console.error('Steam merge exception:', error)
    return json({ error: 'server_error', message: 'Something went wrong on our side. Please try again.' }, 500)
  }
}
