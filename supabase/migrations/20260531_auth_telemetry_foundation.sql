-- Auth telemetry foundation
-- Adds user-state columns to profiles, an append-only auth_events table,
-- and a trigger that derives profile state from events.

-- 1. User-state columns on profiles --------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS first_login_at   timestamptz,
  ADD COLUMN IF NOT EXISTS last_login_at    timestamptz,
  ADD COLUMN IF NOT EXISTS last_seen_at     timestamptz,
  ADD COLUMN IF NOT EXISTS login_count      integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS signup_method    text,
  ADD COLUMN IF NOT EXISTS email_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS status           text NOT NULL DEFAULT 'active';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_status_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_status_check
      CHECK (status IN ('active','suspended','banned','deleted'));
  END IF;
END $$;

-- 2. auth_events: append-only source of truth for the auth funnel --------------
CREATE TABLE IF NOT EXISTS public.auth_events (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  email       text,
  event_type  text NOT NULL,
  method      text,
  ip_address  text,
  user_agent  text,
  country     text,
  city        text,
  metadata    jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_auth_events_user_id    ON public.auth_events(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_events_event_type ON public.auth_events(event_type);
CREATE INDEX IF NOT EXISTS idx_auth_events_created_at ON public.auth_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auth_events_email      ON public.auth_events(lower(email));

COMMENT ON TABLE public.auth_events IS 'Append-only log of authentication lifecycle events (signup, login, logout, etc).';

-- RLS: locked down. Server writes via service role (bypasses RLS).
-- Only admins/moderators may read.
ALTER TABLE public.auth_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view auth events" ON public.auth_events;
CREATE POLICY "Admins can view auth events"
  ON public.auth_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin','moderator')
    )
  );

-- 3. Keep profile state in sync from auth_events ------------------------------
CREATE OR REPLACE FUNCTION public.apply_auth_event_to_profile()
RETURNS trigger AS $$
BEGIN
  IF NEW.user_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.event_type = 'login_success' THEN
    UPDATE public.profiles SET
      last_login_at  = NEW.created_at,
      last_seen_at   = NEW.created_at,
      first_login_at = COALESCE(first_login_at, NEW.created_at),
      login_count    = COALESCE(login_count, 0) + 1
    WHERE id = NEW.user_id;
  ELSIF NEW.event_type = 'signup' THEN
    UPDATE public.profiles SET
      signup_method = COALESCE(signup_method, NEW.method),
      last_seen_at  = NEW.created_at
    WHERE id = NEW.user_id;
  ELSIF NEW.event_type = 'email_verified' THEN
    UPDATE public.profiles SET
      email_verified_at = COALESCE(email_verified_at, NEW.created_at),
      last_seen_at      = NEW.created_at
    WHERE id = NEW.user_id;
  ELSE
    UPDATE public.profiles SET
      last_seen_at = GREATEST(COALESCE(last_seen_at, NEW.created_at), NEW.created_at)
    WHERE id = NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_event_created ON public.auth_events;
CREATE TRIGGER on_auth_event_created
  AFTER INSERT ON public.auth_events
  FOR EACH ROW EXECUTE FUNCTION public.apply_auth_event_to_profile();

-- 4. Backfill existing users from Supabase auth ------------------------------
UPDATE public.profiles p SET
  last_login_at     = u.last_sign_in_at,
  last_seen_at      = COALESCE(u.last_sign_in_at, u.created_at),
  first_login_at    = u.last_sign_in_at,
  email_verified_at = u.email_confirmed_at,
  login_count       = CASE WHEN u.last_sign_in_at IS NOT NULL THEN 1 ELSE 0 END
FROM auth.users u
WHERE u.id = p.id;
