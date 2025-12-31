-- Analytics and Event Tracking System
-- This migration creates tables for comprehensive application analytics

-- Analytics Events Table
CREATE TABLE IF NOT EXISTS public.analytics_events (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  session_id TEXT NOT NULL,
  event_type TEXT NOT NULL, -- page_view, click, form_submit, auth, etc.
  event_name TEXT NOT NULL,
  page_url TEXT,
  page_title TEXT,
  referrer TEXT,
  user_agent TEXT,
  ip_address TEXT,
  country TEXT,
  city TEXT,
  device_type TEXT, -- desktop, mobile, tablet
  browser TEXT,
  os TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- User Sessions Table
CREATE TABLE IF NOT EXISTS public.user_sessions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  session_id TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  ended_at TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER,
  page_views INTEGER DEFAULT 0,
  events_count INTEGER DEFAULT 0,
  entry_page TEXT,
  exit_page TEXT,
  referrer TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  device_type TEXT,
  browser TEXT,
  os TEXT,
  country TEXT,
  city TEXT,
  ip_address TEXT,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Acquisition Channels Table
CREATE TABLE IF NOT EXISTS public.acquisition_channels (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  date DATE NOT NULL,
  source TEXT NOT NULL, -- organic, direct, referral, social, email, paid
  medium TEXT,
  campaign TEXT,
  sessions INTEGER DEFAULT 0,
  new_users INTEGER DEFAULT 0,
  total_users INTEGER DEFAULT 0,
  page_views INTEGER DEFAULT 0,
  avg_session_duration INTEGER,
  bounce_rate DECIMAL(5,2),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(date, source, medium, campaign)
);

-- Page Analytics Table
CREATE TABLE IF NOT EXISTS public.page_analytics (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  date DATE NOT NULL,
  page_url TEXT NOT NULL,
  page_title TEXT,
  views INTEGER DEFAULT 0,
  unique_visitors INTEGER DEFAULT 0,
  avg_time_on_page INTEGER,
  bounce_rate DECIMAL(5,2),
  exit_rate DECIMAL(5,2),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(date, page_url)
);

-- User Engagement Table
CREATE TABLE IF NOT EXISTS public.user_engagement (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  sessions INTEGER DEFAULT 0,
  total_session_time INTEGER DEFAULT 0,
  page_views INTEGER DEFAULT 0,
  events INTEGER DEFAULT 0,
  actions JSONB DEFAULT '{}'::jsonb, -- track specific actions
  last_active_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, date)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id ON public.analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_session_id ON public.analytics_events(session_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_event_type ON public.analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON public.analytics_events(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_sessions_session_id ON public.user_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON public.user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_started_at ON public.user_sessions(started_at DESC);

CREATE INDEX IF NOT EXISTS idx_acquisition_date ON public.acquisition_channels(date DESC);
CREATE INDEX IF NOT EXISTS idx_acquisition_source ON public.acquisition_channels(source);

CREATE INDEX IF NOT EXISTS idx_page_analytics_date ON public.page_analytics(date DESC);
CREATE INDEX IF NOT EXISTS idx_page_analytics_url ON public.page_analytics(page_url);

CREATE INDEX IF NOT EXISTS idx_user_engagement_user_id ON public.user_engagement(user_id);
CREATE INDEX IF NOT EXISTS idx_user_engagement_date ON public.user_engagement(date DESC);

-- Add comments
COMMENT ON TABLE public.analytics_events IS 'Individual user events and interactions';
COMMENT ON TABLE public.user_sessions IS 'User session tracking with duration and metadata';
COMMENT ON TABLE public.acquisition_channels IS 'Daily aggregated data by acquisition source';
COMMENT ON TABLE public.page_analytics IS 'Daily page-level analytics';
COMMENT ON TABLE public.user_engagement IS 'Daily per-user engagement metrics';

-- Enable Row Level Security
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.acquisition_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.page_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_engagement ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Only admins can read analytics data
CREATE POLICY "Admins can view analytics events"
  ON public.analytics_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'moderator')
    )
  );

CREATE POLICY "Admins can view user sessions"
  ON public.user_sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'moderator')
    )
  );

CREATE POLICY "Admins can view acquisition data"
  ON public.acquisition_channels FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'moderator')
    )
  );

CREATE POLICY "Admins can view page analytics"
  ON public.page_analytics FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'moderator')
    )
  );

CREATE POLICY "Admins can view engagement data"
  ON public.user_engagement FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'moderator')
    )
  );

-- Allow inserting analytics events from client
CREATE POLICY "Anyone can insert analytics events"
  ON public.analytics_events FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can insert user sessions"
  ON public.user_sessions FOR INSERT
  WITH CHECK (true);

-- Function to update session end time
CREATE OR REPLACE FUNCTION public.end_user_session(p_session_id TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE public.user_sessions
  SET
    ended_at = NOW(),
    duration_seconds = EXTRACT(EPOCH FROM (NOW() - started_at))::INTEGER
  WHERE session_id = p_session_id
  AND ended_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get real-time analytics summary
CREATE OR REPLACE FUNCTION public.get_analytics_summary(days INTEGER DEFAULT 7)
RETURNS TABLE (
  total_sessions BIGINT,
  total_page_views BIGINT,
  total_users BIGINT,
  avg_session_duration NUMERIC,
  bounce_rate NUMERIC,
  top_pages JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(DISTINCT s.session_id)::BIGINT as total_sessions,
    COUNT(e.id)::BIGINT as total_page_views,
    COUNT(DISTINCT s.user_id)::BIGINT as total_users,
    ROUND(AVG(s.duration_seconds), 2) as avg_session_duration,
    ROUND(
      (COUNT(CASE WHEN s.page_views = 1 THEN 1 END)::NUMERIC /
       NULLIF(COUNT(*), 0)) * 100, 2
    ) as bounce_rate,
    (
      SELECT jsonb_agg(row_to_json(top))
      FROM (
        SELECT page_url, COUNT(*) as views
        FROM public.analytics_events
        WHERE event_type = 'page_view'
        AND created_at >= NOW() - (days || ' days')::INTERVAL
        GROUP BY page_url
        ORDER BY views DESC
        LIMIT 10
      ) top
    ) as top_pages
  FROM public.user_sessions s
  LEFT JOIN public.analytics_events e ON e.session_id = s.session_id
  WHERE s.started_at >= NOW() - (days || ' days')::INTERVAL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT SELECT ON public.analytics_events TO authenticated;
GRANT SELECT ON public.user_sessions TO authenticated;
GRANT SELECT ON public.acquisition_channels TO authenticated;
GRANT SELECT ON public.page_analytics TO authenticated;
GRANT SELECT ON public.user_engagement TO authenticated;
GRANT INSERT ON public.analytics_events TO anon, authenticated;
GRANT INSERT ON public.user_sessions TO anon, authenticated;
GRANT UPDATE ON public.user_sessions TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.end_user_session(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_analytics_summary(INTEGER) TO authenticated;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Analytics system created successfully!';
  RAISE NOTICE 'Tables: analytics_events, user_sessions, acquisition_channels, page_analytics, user_engagement';
  RAISE NOTICE 'RLS policies: Admin read access, public write for events';
  RAISE NOTICE 'Functions: end_user_session(), get_analytics_summary()';
END $$;
