-- Page/event analytics tables consumed by src/lib/analytics.ts and /admin/analytics.
-- Uses gen_random_uuid() (pgcrypto, available by default on Supabase).

CREATE TABLE IF NOT EXISTS public.user_sessions (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id       text UNIQUE NOT NULL,
  user_id          uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  started_at       timestamptz NOT NULL DEFAULT now(),
  ended_at         timestamptz,
  duration_seconds integer,
  page_views       integer NOT NULL DEFAULT 0,
  events_count     integer NOT NULL DEFAULT 0,
  entry_page       text,
  exit_page        text,
  referrer         text,
  utm_source       text,
  utm_medium       text,
  utm_campaign     text,
  device_type      text,
  browser          text,
  os               text,
  country          text,
  city             text,
  ip_address       text,
  metadata         jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS public.analytics_events (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  session_id  text NOT NULL,
  event_type  text NOT NULL,
  event_name  text NOT NULL,
  page_url    text,
  page_title  text,
  referrer    text,
  user_agent  text,
  ip_address  text,
  country     text,
  city        text,
  device_type text,
  browser     text,
  os          text,
  metadata    jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_session_id ON public.user_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id    ON public.user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_started_at ON public.user_sessions(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_session_id ON public.analytics_events(session_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id    ON public.analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_event_type ON public.analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON public.analytics_events(created_at DESC);

-- RLS: server writes via service role (bypasses RLS). Admins/moderators read.
ALTER TABLE public.user_sessions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view user sessions" ON public.user_sessions;
CREATE POLICY "Admins can view user sessions"
  ON public.user_sessions FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin','moderator')));

DROP POLICY IF EXISTS "Admins can view analytics events" ON public.analytics_events;
CREATE POLICY "Admins can view analytics events"
  ON public.analytics_events FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin','moderator')));

-- Close out a session and compute its duration.
CREATE OR REPLACE FUNCTION public.end_user_session(p_session_id text)
RETURNS void AS $$
BEGIN
  UPDATE public.user_sessions
  SET ended_at = now(),
      duration_seconds = EXTRACT(EPOCH FROM (now() - started_at))::integer
  WHERE session_id = p_session_id AND ended_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Atomically bump a session's page-view counter and update its exit page.
CREATE OR REPLACE FUNCTION public.increment_session_pageview(p_session_id text, p_exit_page text DEFAULT NULL)
RETURNS void AS $$
BEGIN
  UPDATE public.user_sessions
  SET page_views = COALESCE(page_views, 0) + 1,
      exit_page  = COALESCE(p_exit_page, exit_page)
  WHERE session_id = p_session_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Atomically bump a session's custom-event counter.
CREATE OR REPLACE FUNCTION public.increment_session_events(p_session_id text)
RETURNS void AS $$
BEGIN
  UPDATE public.user_sessions
  SET events_count = COALESCE(events_count, 0) + 1
  WHERE session_id = p_session_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
