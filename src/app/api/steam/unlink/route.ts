import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabaseServer'
import { getSessionFromRequest } from '@/lib/session'
import { validateCSRFFromRequest } from '@/lib/csrf'
import { isSyntheticSteamEmail } from '@/lib/steamIdentity'

export const dynamic = 'force-dynamic'

/**
 * POST /api/steam/unlink - Detach Steam from the signed-in account.
 *
 * Refused for accounts that were created through Steam and have no real
 * email: Steam is their only way back in, so unlinking would lock them out.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized - Please log in' }, { status: 401 })
    }
    if (!(await validateCSRFFromRequest(request))) {
      return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 })
    }

    const supabase = createServerClient()

    const { data: authUser } = await supabase.auth.admin.getUserById(session.userId)
    const email = authUser?.user?.email || session.email
    if (isSyntheticSteamEmail(email)) {
      return NextResponse.json(
        {
          error: 'steam_only_account',
          message:
            'This account was created with Steam and has no email or password, so Steam cannot be unlinked.',
        },
        { status: 409 }
      )
    }

    const { data: profile, error: readError } = await (supabase.from('profiles') as any)
      .select('steam_id')
      .eq('id', session.userId)
      .maybeSingle()
    if (readError) throw readError

    if (profile?.steam_id) {
      const { error: updateError } = await (supabase.from('profiles') as any)
        .update({ steam_id: null })
        .eq('id', session.userId)
      if (updateError) throw updateError

      const { error: metaError } = await supabase.auth.admin.updateUserById(session.userId, {
        app_metadata: { steam_id: null },
      })
      if (metaError) console.error('Steam unlink app_metadata update failed:', metaError)
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Steam unlink error:', error)
    return NextResponse.json({ error: 'Failed to unlink Steam' }, { status: 500 })
  }
}
