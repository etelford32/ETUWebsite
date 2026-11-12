import { createServerClient } from './supabaseServer'
import {
  sendWelcomeEmail,
  sendVerifyNudgeEmail,
  sendDormantEmail,
  sendNewDeviceAlertEmail,
  sendAdminDigestEmail,
  sendDemoReminderEmail,
  sendDemoLiveEmail,
} from './lifecycleEmails'
import { DEMO_CAMPAIGN_ID, DEMO_RELEASE_AT, isDemoLive } from './campaign'
import { isSyntheticSteamEmail } from './steamIdentity'

/**
 * Lifecycle automations.
 *
 * Two phases, both driven by /api/automations/run (cron):
 *   1. generateLifecycleJobs() — scan user_states and enqueue jobs that are due.
 *   2. processLifecycleJobs()  — send pending jobs via Resend, mark sent/failed.
 *
 * Some jobs (e.g. welcome_email) are enqueued inline from the auth routes the
 * moment the triggering event happens; the generator only covers time-based
 * states (verify_nudge, dormant_*) that can't be detected at request time.
 *
 * Idempotency is enforced by lifecycle_jobs.dedupe_key (UNIQUE).
 *
 * The demo campaign adds two emails (demo_reminder, demo_live) for accounts
 * with `profiles.newsletter` on. They are off until DEMO_EMAILS_ENABLED=true
 * is set, so nothing goes out before the launch time in campaign.ts has been
 * confirmed.
 */

export type LifecycleJobType =
  | 'welcome_email'
  | 'verify_nudge'
  | 'dormant_14'
  | 'dormant_30'
  | 'new_device_alert'
  | 'admin_digest'
  | 'demo_reminder'
  | 'demo_live'

export interface EnqueueJobOptions {
  userId: string | null
  jobType: LifecycleJobType
  dedupeKey: string
  payload?: Record<string, any>
  scheduledFor?: Date
}

/**
 * Enqueue a lifecycle job. Safe to call repeatedly — a duplicate dedupe_key is
 * ignored. Never throws.
 */
export async function enqueueLifecycleJob(opts: EnqueueJobOptions): Promise<void> {
  try {
    const supabase = createServerClient()
    await (supabase.from('lifecycle_jobs') as any)
      .upsert(
        {
          user_id: opts.userId,
          job_type: opts.jobType,
          dedupe_key: opts.dedupeKey,
          payload: opts.payload ?? {},
          scheduled_for: (opts.scheduledFor ?? new Date()).toISOString(),
          status: 'pending',
        },
        { onConflict: 'dedupe_key', ignoreDuplicates: true }
      )
  } catch (err: any) {
    console.error('enqueueLifecycleJob failed:', err?.message || err)
  }
}

interface GenerateResult {
  verifyNudge: number
  dormant14: number
  dormant30: number
  adminDigest: number
  demoReminder: number
  demoLive: number
}

const HOUR_MS = 60 * 60 * 1000

/** Campaign emails stay off until the launch time has been confirmed. */
function demoEmailsEnabled(): boolean {
  return process.env.DEMO_EMAILS_ENABLED === 'true'
}

/**
 * Which demo email is due right now: the reminder during the 24 hours before
 * launch, the launch email for the 48 hours after it, otherwise none.
 */
export function demoEmailDue(now: number = Date.now()): 'demo_reminder' | 'demo_live' | null {
  const release = Date.parse(DEMO_RELEASE_AT)
  if (now >= release - 24 * HOUR_MS && now < release) return 'demo_reminder'
  if (now >= release && now < release + 48 * HOUR_MS) return 'demo_live'
  return null
}

/** Enqueue the due demo email for every account that asked for it. */
async function generateDemoJobs(): Promise<{ demoReminder: number; demoLive: number }> {
  const counts = { demoReminder: 0, demoLive: 0 }
  const jobType = demoEmailsEnabled() ? demoEmailDue() : null
  if (!jobType) return counts

  const supabase = createServerClient()
  const PAGE = 1000
  for (let from = 0; ; from += PAGE) {
    const { data: rows, error } = await (supabase.from('profiles') as any)
      .select('id, email, display_name, status')
      .eq('newsletter', true)
      .not('email', 'is', null)
      .order('id', { ascending: true })
      .range(from, from + PAGE - 1)
    if (error || !rows?.length) break

    for (const u of rows) {
      // Steam-created accounts carry a synthetic address that is never mailed.
      if (isSyntheticSteamEmail(u.email)) continue
      if (['banned', 'suspended', 'deleted'].includes(u.status)) continue
      await enqueueLifecycleJob({
        userId: u.id,
        jobType,
        dedupeKey: `${jobType}:${DEMO_CAMPAIGN_ID}:${u.id}`,
        payload: { email: u.email, displayName: u.display_name },
      })
      if (jobType === 'demo_live') counts.demoLive++
      else counts.demoReminder++
    }
    if (rows.length < PAGE) break
  }
  return counts
}

/** Still opted in at send time? Guards against a toggle flipped after enqueue. */
async function wantsDemoEmails(userId: string | null): Promise<boolean> {
  if (!userId) return false
  const supabase = createServerClient()
  const { data } = await (supabase.from('profiles') as any)
    .select('newsletter')
    .eq('id', userId)
    .maybeSingle()
  return data?.newsletter === true
}

/**
 * Scan user_states and enqueue time-based jobs that are now due.
 * Returns counts of newly-enqueued jobs by type.
 */
export async function generateLifecycleJobs(): Promise<GenerateResult> {
  const supabase = createServerClient()
  const result: GenerateResult = {
    verifyNudge: 0,
    dormant14: 0,
    dormant30: 0,
    adminDigest: 0,
    demoReminder: 0,
    demoLive: 0,
  }

  // --- verify_nudge: signed up > 24h ago, still unverified -------------------
  const { data: unverified } = await (supabase.from('user_states') as any)
    .select('id, email, display_name')
    .is('email_verified_at', null)
    .not('email', 'is', null)
    .lt('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .limit(500)

  for (const u of unverified ?? []) {
    await enqueueLifecycleJob({
      userId: u.id,
      jobType: 'verify_nudge',
      dedupeKey: `verify_nudge:${u.id}`,
      payload: { email: u.email, displayName: u.display_name },
    })
    result.verifyNudge++
  }

  // --- dormant_14 / dormant_30 ----------------------------------------------
  // Re-engage users who have gone quiet. Coarse monthly bucket in the dedupe
  // key lets the same user be re-targeted in a later dormancy spell.
  const bucket = new Date().toISOString().slice(0, 7) // YYYY-MM

  const { data: dormant } = await (supabase.from('user_states') as any)
    .select('id, email, display_name, lifecycle_state')
    .in('lifecycle_state', ['dormant', 'churned'])
    .not('email', 'is', null)
    .limit(500)

  for (const u of dormant ?? []) {
    const type: LifecycleJobType = u.lifecycle_state === 'churned' ? 'dormant_30' : 'dormant_14'
    await enqueueLifecycleJob({
      userId: u.id,
      jobType: type,
      dedupeKey: `${type}:${u.id}:${bucket}`,
      payload: { email: u.email, displayName: u.display_name },
    })
    if (type === 'dormant_30') result.dormant30++
    else result.dormant14++
  }

  // --- admin_digest: once per day -------------------------------------------
  const day = new Date().toISOString().slice(0, 10) // YYYY-MM-DD
  await enqueueLifecycleJob({
    userId: null,
    jobType: 'admin_digest',
    dedupeKey: `admin_digest:${day}`,
    payload: { day },
  })
  result.adminDigest++

  // --- demo campaign: reminder the day before, launch email on the day -------
  Object.assign(result, await generateDemoJobs())

  return result
}

interface ProcessResult {
  processed: number
  sent: number
  failed: number
  skipped: number
}

const MAX_ATTEMPTS = 5

/**
 * Send all due pending jobs. Returns a summary.
 */
export async function processLifecycleJobs(limit = 100): Promise<ProcessResult> {
  const supabase = createServerClient()
  const summary: ProcessResult = { processed: 0, sent: 0, failed: 0, skipped: 0 }

  const { data: jobs } = await (supabase.from('lifecycle_jobs') as any)
    .select('*')
    .eq('status', 'pending')
    .lt('attempts', MAX_ATTEMPTS)
    .lte('scheduled_for', new Date().toISOString())
    .order('scheduled_for', { ascending: true })
    .limit(limit)

  for (const job of jobs ?? []) {
    summary.processed++
    try {
      const outcome = await dispatchJob(job)
      if (outcome === 'skipped') {
        await markJob(supabase, job.id, 'skipped')
        summary.skipped++
      } else {
        await markJob(supabase, job.id, 'sent')
        summary.sent++
      }
    } catch (err: any) {
      const attempts = (job.attempts ?? 0) + 1
      await (supabase.from('lifecycle_jobs') as any)
        .update({
          status: attempts >= MAX_ATTEMPTS ? 'failed' : 'pending',
          attempts,
          last_error: String(err?.message || err).slice(0, 500),
        })
        .eq('id', job.id)
      summary.failed++
    }
  }

  return summary
}

/** Returns 'sent' or 'skipped'. Throws on a hard failure (to be retried). */
async function dispatchJob(job: any): Promise<'sent' | 'skipped'> {
  const email: string | undefined = job.payload?.email
  const displayName: string | undefined = job.payload?.displayName

  switch (job.job_type as LifecycleJobType) {
    case 'welcome_email':
      if (!email) return 'skipped'
      return (await sendWelcomeEmail(email, displayName)) ? 'sent' : 'skipped'
    case 'verify_nudge':
      if (!email) return 'skipped'
      return (await sendVerifyNudgeEmail(email, displayName)) ? 'sent' : 'skipped'
    case 'dormant_14':
    case 'dormant_30':
      if (!email) return 'skipped'
      return (await sendDormantEmail(email, displayName, job.job_type === 'dormant_30'))
        ? 'sent'
        : 'skipped'
    case 'new_device_alert':
      if (!email) return 'skipped'
      return (await sendNewDeviceAlertEmail(email, displayName, {
        ip: job.payload?.ip ?? null,
        userAgent: job.payload?.userAgent ?? null,
        at: job.payload?.at ?? new Date().toISOString(),
      }))
        ? 'sent'
        : 'skipped'
    case 'admin_digest':
      return (await sendAdminDigest()) ? 'sent' : 'skipped'
    case 'demo_reminder':
      // A reminder that would arrive after launch is no longer true.
      if (!email || !demoEmailsEnabled() || isDemoLive()) return 'skipped'
      if (!(await wantsDemoEmails(job.user_id))) return 'skipped'
      return (await sendDemoReminderEmail(email, displayName)) ? 'sent' : 'skipped'
    case 'demo_live':
      if (!email || !demoEmailsEnabled() || !isDemoLive()) return 'skipped'
      if (!(await wantsDemoEmails(job.user_id))) return 'skipped'
      return (await sendDemoLiveEmail(email, displayName)) ? 'sent' : 'skipped'
    default:
      return 'skipped'
  }
}

async function sendAdminDigest(): Promise<boolean> {
  const supabase = createServerClient()
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  const { data: counts } = await (supabase.from('user_state_counts') as any).select('*')
  const { count: newSignups } = await (supabase.from('auth_events') as any)
    .select('*', { count: 'exact', head: true })
    .eq('event_type', 'signup')
    .gte('created_at', since)
  const { count: failedLogins } = await (supabase.from('auth_events') as any)
    .select('*', { count: 'exact', head: true })
    .eq('event_type', 'login_failed')
    .gte('created_at', since)

  const adminEmail = process.env.ADMIN_DIGEST_EMAIL || process.env.ADMIN_EMAIL
  if (!adminEmail) return false

  return sendAdminDigestEmail(adminEmail, {
    stateCounts: counts ?? [],
    newSignups: newSignups ?? 0,
    failedLogins: failedLogins ?? 0,
  })
}

async function markJob(supabase: any, id: string, status: 'sent' | 'skipped') {
  await supabase
    .from('lifecycle_jobs')
    .update({ status, sent_at: new Date().toISOString() })
    .eq('id', id)
}
