import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { isStaff } from '@/lib/adminAuth'
import { generateLifecycleJobs, processLifecycleJobs } from '@/lib/lifecycle'

/**
 * POST /api/automations/run — lifecycle automation tick.
 *
 * 1. generateLifecycleJobs() — enqueue time-based jobs that are now due
 *    (verify nudges, dormant re-engagement, daily admin digest).
 * 2. processLifecycleJobs()  — send pending jobs via Resend.
 *
 * Auth: either a cron caller with `Authorization: Bearer ${CRON_SECRET}`
 * (matches the existing notifications cron), or a logged-in staff member.
 *
 * Designed to be hit on a schedule (Vercel Cron — see vercel.json).
 */
async function authorize(request: NextRequest): Promise<boolean> {
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const header = request.headers.get('authorization')
    if (header === `Bearer ${cronSecret}`) return true
  }
  // Fall back to a staff session so it can be triggered manually from admin.
  const session = await getSession()
  if (session && (await isStaff(session.userId))) return true
  return false
}

async function run(request: NextRequest) {
  if (!(await authorize(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const generated = await generateLifecycleJobs()
  const processed = await processLifecycleJobs()

  return NextResponse.json({ ok: true, generated, processed, ranAt: new Date().toISOString() })
}

export async function POST(request: NextRequest) {
  return run(request)
}

// Vercel Cron invokes endpoints with GET.
export async function GET(request: NextRequest) {
  return run(request)
}
