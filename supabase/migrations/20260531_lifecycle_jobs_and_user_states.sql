-- Automation queue + derived user-state views.

-- 1. lifecycle_jobs: queue for outbound lifecycle automations -----------------
CREATE TABLE IF NOT EXISTS public.lifecycle_jobs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  job_type      text NOT NULL,            -- welcome_email, verify_nudge, dormant_14, dormant_30, new_device_alert, admin_digest
  status        text NOT NULL DEFAULT 'pending', -- pending, sent, failed, skipped
  dedupe_key    text UNIQUE,              -- prevents duplicate enqueues
  scheduled_for timestamptz NOT NULL DEFAULT now(),
  attempts      integer NOT NULL DEFAULT 0,
  last_error    text,
  payload       jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at    timestamptz NOT NULL DEFAULT now(),
  sent_at       timestamptz,
  CONSTRAINT lifecycle_jobs_status_check CHECK (status IN ('pending','sent','failed','skipped'))
);

CREATE INDEX IF NOT EXISTS idx_lifecycle_jobs_status        ON public.lifecycle_jobs(status);
CREATE INDEX IF NOT EXISTS idx_lifecycle_jobs_scheduled_for ON public.lifecycle_jobs(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_lifecycle_jobs_user_id       ON public.lifecycle_jobs(user_id);

ALTER TABLE public.lifecycle_jobs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can view lifecycle jobs" ON public.lifecycle_jobs;
CREATE POLICY "Admins can view lifecycle jobs"
  ON public.lifecycle_jobs FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin','moderator')));

-- 2. user_states: current lifecycle state per user ---------------------------
CREATE OR REPLACE VIEW public.user_states
WITH (security_invoker = true) AS
WITH base AS (
  SELECT
    p.id, p.email, p.display_name, p.role, p.status,
    p.created_at, p.first_login_at, p.last_login_at, p.last_seen_at,
    p.login_count, p.signup_method, p.email_verified_at,
    COALESCE(p.last_seen_at, p.last_login_at, p.created_at) AS activity_at
  FROM public.profiles p
)
SELECT
  base.*,
  CASE
    WHEN status = 'banned'    THEN 'banned'
    WHEN status = 'suspended' THEN 'suspended'
    WHEN status = 'deleted'   THEN 'deleted'
    WHEN last_login_at IS NULL                                THEN 'never_logged_in'
    WHEN now() - activity_at > interval '30 days'             THEN 'churned'
    WHEN now() - activity_at > interval '14 days'             THEN 'dormant'
    WHEN login_count <= 1 AND now() - created_at < interval '1 day' THEN 'new'
    ELSE 'active'
  END AS lifecycle_state
FROM base;

-- 3. user_state_counts: aggregate for the admin dashboard --------------------
CREATE OR REPLACE VIEW public.user_state_counts
WITH (security_invoker = true) AS
SELECT lifecycle_state, COUNT(*)::bigint AS count
FROM public.user_states
GROUP BY lifecycle_state;
