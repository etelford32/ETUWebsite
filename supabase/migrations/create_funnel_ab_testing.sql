-- Funnel Analysis and A/B Testing System
-- This migration creates tables for conversion funnels and A/B experiments

-- Funnels Table
CREATE TABLE IF NOT EXISTS public.funnels (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  steps JSONB NOT NULL, -- Array of step definitions
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- Funnel Events Table
CREATE TABLE IF NOT EXISTS public.funnel_events (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  funnel_id UUID REFERENCES public.funnels(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  session_id TEXT NOT NULL,
  step_index INTEGER NOT NULL,
  step_name TEXT NOT NULL,
  completed BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Funnel Conversions Table (aggregated data)
CREATE TABLE IF NOT EXISTS public.funnel_conversions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  funnel_id UUID REFERENCES public.funnels(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  step_index INTEGER NOT NULL,
  step_name TEXT NOT NULL,
  entered INTEGER DEFAULT 0,
  completed INTEGER DEFAULT 0,
  conversion_rate DECIMAL(5,2),
  drop_off_rate DECIMAL(5,2),
  avg_time_to_complete INTEGER,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(funnel_id, date, step_index)
);

-- A/B Experiments Table
CREATE TABLE IF NOT EXISTS public.ab_experiments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  hypothesis TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'running', 'paused', 'completed', 'archived')),
  variants JSONB NOT NULL, -- Array of variant definitions
  traffic_allocation JSONB NOT NULL, -- Percentage split
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  target_sample_size INTEGER,
  confidence_level DECIMAL(5,2) DEFAULT 95.00,
  primary_metric TEXT NOT NULL,
  secondary_metrics JSONB DEFAULT '[]'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- A/B Test Assignments Table
CREATE TABLE IF NOT EXISTS public.ab_assignments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  experiment_id UUID REFERENCES public.ab_experiments(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  variant_id TEXT NOT NULL,
  variant_name TEXT NOT NULL,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  UNIQUE(experiment_id, user_id),
  UNIQUE(experiment_id, session_id)
);

-- A/B Test Events Table
CREATE TABLE IF NOT EXISTS public.ab_events (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  experiment_id UUID REFERENCES public.ab_experiments(id) ON DELETE CASCADE NOT NULL,
  assignment_id UUID REFERENCES public.ab_assignments(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  session_id TEXT NOT NULL,
  variant_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  event_name TEXT NOT NULL,
  event_value DECIMAL(10,2),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- A/B Test Results Table (aggregated metrics)
CREATE TABLE IF NOT EXISTS public.ab_results (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  experiment_id UUID REFERENCES public.ab_experiments(id) ON DELETE CASCADE NOT NULL,
  variant_id TEXT NOT NULL,
  variant_name TEXT NOT NULL,
  metric_name TEXT NOT NULL,
  metric_type TEXT NOT NULL, -- conversion, revenue, engagement, etc.
  sample_size INTEGER DEFAULT 0,
  total_value DECIMAL(10,2) DEFAULT 0,
  mean_value DECIMAL(10,2),
  std_deviation DECIMAL(10,2),
  confidence_interval JSONB,
  p_value DECIMAL(10,8),
  is_significant BOOLEAN,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(experiment_id, variant_id, metric_name)
);

-- Real-time Stats Table (for dashboard)
CREATE TABLE IF NOT EXISTS public.realtime_stats (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  stat_type TEXT NOT NULL, -- active_users, sessions_today, events_per_minute, etc.
  value DECIMAL(10,2) NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(stat_type)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_funnel_events_funnel_id ON public.funnel_events(funnel_id);
CREATE INDEX IF NOT EXISTS idx_funnel_events_session_id ON public.funnel_events(session_id);
CREATE INDEX IF NOT EXISTS idx_funnel_events_created_at ON public.funnel_events(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_funnel_conversions_funnel_id ON public.funnel_conversions(funnel_id);
CREATE INDEX IF NOT EXISTS idx_funnel_conversions_date ON public.funnel_conversions(date DESC);

CREATE INDEX IF NOT EXISTS idx_ab_experiments_status ON public.ab_experiments(status);
CREATE INDEX IF NOT EXISTS idx_ab_experiments_start_date ON public.ab_experiments(start_date DESC);

CREATE INDEX IF NOT EXISTS idx_ab_assignments_experiment_id ON public.ab_assignments(experiment_id);
CREATE INDEX IF NOT EXISTS idx_ab_assignments_user_id ON public.ab_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_ab_assignments_session_id ON public.ab_assignments(session_id);

CREATE INDEX IF NOT EXISTS idx_ab_events_experiment_id ON public.ab_events(experiment_id);
CREATE INDEX IF NOT EXISTS idx_ab_events_assignment_id ON public.ab_events(assignment_id);
CREATE INDEX IF NOT EXISTS idx_ab_events_created_at ON public.ab_events(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ab_results_experiment_id ON public.ab_results(experiment_id);

-- Add comments
COMMENT ON TABLE public.funnels IS 'Conversion funnel definitions';
COMMENT ON TABLE public.funnel_events IS 'Individual funnel step events';
COMMENT ON TABLE public.funnel_conversions IS 'Daily aggregated funnel metrics';
COMMENT ON TABLE public.ab_experiments IS 'A/B test experiment definitions';
COMMENT ON TABLE public.ab_assignments IS 'User assignments to A/B test variants';
COMMENT ON TABLE public.ab_events IS 'Events tracked for A/B experiments';
COMMENT ON TABLE public.ab_results IS 'Aggregated A/B test results and statistics';
COMMENT ON TABLE public.realtime_stats IS 'Real-time dashboard statistics';

-- Enable Row Level Security
ALTER TABLE public.funnels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.funnel_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.funnel_conversions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ab_experiments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ab_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ab_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ab_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.realtime_stats ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Admins can read/write, users can read assignments
CREATE POLICY "Admins can manage funnels"
  ON public.funnels FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'moderator')
    )
  );

CREATE POLICY "Anyone can insert funnel events"
  ON public.funnel_events FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can view funnel events"
  ON public.funnel_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'moderator')
    )
  );

CREATE POLICY "Admins can view funnel conversions"
  ON public.funnel_conversions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'moderator')
    )
  );

CREATE POLICY "Admins can manage experiments"
  ON public.ab_experiments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'moderator')
    )
  );

CREATE POLICY "Users can view their assignments"
  ON public.ab_assignments FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'moderator')
    )
  );

CREATE POLICY "Anyone can insert assignments"
  ON public.ab_assignments FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can insert ab events"
  ON public.ab_events FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can view ab events"
  ON public.ab_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'moderator')
    )
  );

CREATE POLICY "Admins can view ab results"
  ON public.ab_results FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'moderator')
    )
  );

CREATE POLICY "Anyone can view realtime stats"
  ON public.realtime_stats FOR SELECT
  USING (true);

-- Function to track funnel step
CREATE OR REPLACE FUNCTION public.track_funnel_step(
  p_funnel_id UUID,
  p_user_id UUID,
  p_session_id TEXT,
  p_step_index INTEGER,
  p_step_name TEXT,
  p_completed BOOLEAN DEFAULT false
)
RETURNS UUID AS $$
DECLARE
  v_event_id UUID;
BEGIN
  INSERT INTO public.funnel_events (
    funnel_id,
    user_id,
    session_id,
    step_index,
    step_name,
    completed
  ) VALUES (
    p_funnel_id,
    p_user_id,
    p_session_id,
    p_step_index,
    p_step_name,
    p_completed
  )
  RETURNING id INTO v_event_id;

  RETURN v_event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to assign user to A/B test variant
CREATE OR REPLACE FUNCTION public.assign_ab_variant(
  p_experiment_id UUID,
  p_user_id UUID,
  p_session_id TEXT
)
RETURNS TABLE (
  assignment_id UUID,
  variant_id TEXT,
  variant_name TEXT
) AS $$
DECLARE
  v_assignment_id UUID;
  v_variant_id TEXT;
  v_variant_name TEXT;
  v_variants JSONB;
  v_allocation JSONB;
  v_random DECIMAL;
  v_cumulative DECIMAL := 0;
  v_variant JSONB;
BEGIN
  -- Check if already assigned
  SELECT id, ab_assignments.variant_id, ab_assignments.variant_name
  INTO v_assignment_id, v_variant_id, v_variant_name
  FROM public.ab_assignments
  WHERE experiment_id = p_experiment_id
  AND (user_id = p_user_id OR session_id = p_session_id)
  LIMIT 1;

  IF v_assignment_id IS NOT NULL THEN
    RETURN QUERY SELECT v_assignment_id, v_variant_id, v_variant_name;
    RETURN;
  END IF;

  -- Get experiment variants and allocation
  SELECT variants, traffic_allocation
  INTO v_variants, v_allocation
  FROM public.ab_experiments
  WHERE id = p_experiment_id
  AND status = 'running';

  IF v_variants IS NULL THEN
    RAISE EXCEPTION 'Experiment not found or not running';
  END IF;

  -- Random assignment based on traffic allocation
  v_random := random();

  FOR v_variant IN SELECT * FROM jsonb_array_elements(v_variants)
  LOOP
    v_cumulative := v_cumulative + (v_allocation->>v_variant->>'id')::DECIMAL / 100.0;
    IF v_random <= v_cumulative THEN
      v_variant_id := v_variant->>'id';
      v_variant_name := v_variant->>'name';
      EXIT;
    END IF;
  END LOOP;

  -- Insert assignment
  INSERT INTO public.ab_assignments (
    experiment_id,
    user_id,
    session_id,
    variant_id,
    variant_name
  ) VALUES (
    p_experiment_id,
    p_user_id,
    p_session_id,
    v_variant_id,
    v_variant_name
  )
  RETURNING id INTO v_assignment_id;

  RETURN QUERY SELECT v_assignment_id, v_variant_id, v_variant_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update realtime stats
CREATE OR REPLACE FUNCTION public.update_realtime_stat(
  p_stat_type TEXT,
  p_value DECIMAL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.realtime_stats (stat_type, value, metadata, updated_at)
  VALUES (p_stat_type, p_value, p_metadata, NOW())
  ON CONFLICT (stat_type)
  DO UPDATE SET
    value = p_value,
    metadata = p_metadata,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get funnel conversion rates
CREATE OR REPLACE FUNCTION public.get_funnel_stats(p_funnel_id UUID, days INTEGER DEFAULT 7)
RETURNS TABLE (
  step_index INTEGER,
  step_name TEXT,
  entered BIGINT,
  completed BIGINT,
  conversion_rate NUMERIC,
  drop_off_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH step_data AS (
    SELECT
      fe.step_index,
      fe.step_name,
      COUNT(DISTINCT fe.session_id) as entered,
      COUNT(DISTINCT CASE WHEN fe.completed THEN fe.session_id END) as completed
    FROM public.funnel_events fe
    WHERE fe.funnel_id = p_funnel_id
    AND fe.created_at >= NOW() - (days || ' days')::INTERVAL
    GROUP BY fe.step_index, fe.step_name
  )
  SELECT
    sd.step_index,
    sd.step_name,
    sd.entered,
    sd.completed,
    ROUND((sd.completed::NUMERIC / NULLIF(sd.entered, 0)) * 100, 2) as conversion_rate,
    ROUND(((sd.entered - sd.completed)::NUMERIC / NULLIF(sd.entered, 0)) * 100, 2) as drop_off_rate
  FROM step_data sd
  ORDER BY sd.step_index;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT SELECT, INSERT ON public.funnels TO authenticated;
GRANT SELECT, INSERT ON public.funnel_events TO anon, authenticated;
GRANT SELECT ON public.funnel_conversions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.ab_experiments TO authenticated;
GRANT SELECT, INSERT ON public.ab_assignments TO anon, authenticated;
GRANT SELECT, INSERT ON public.ab_events TO anon, authenticated;
GRANT SELECT ON public.ab_results TO authenticated;
GRANT SELECT ON public.realtime_stats TO anon, authenticated;

GRANT EXECUTE ON FUNCTION public.track_funnel_step TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.assign_ab_variant TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_realtime_stat TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_funnel_stats TO authenticated;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Funnel analysis and A/B testing system created successfully!';
  RAISE NOTICE 'Tables: funnels, funnel_events, funnel_conversions, ab_experiments, ab_assignments, ab_events, ab_results, realtime_stats';
  RAISE NOTICE 'Functions: track_funnel_step(), assign_ab_variant(), update_realtime_stat(), get_funnel_stats()';
END $$;
