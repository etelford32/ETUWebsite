-- Create alpha applications table for closed alpha playtesting signups
-- Run this migration in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.alpha_applications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  username TEXT NOT NULL,
  email TEXT NOT NULL,
  discord TEXT,
  interests TEXT[] NOT NULL,
  experience TEXT NOT NULL CHECK (experience IN ('beginner', 'intermediate', 'advanced', 'competitive')),
  availability TEXT,
  motivation TEXT NOT NULL,
  balancing_interest TEXT,
  ai_difficulty_feedback TEXT,
  bug_testing_experience TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'accepted')),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_alpha_applications_status ON public.alpha_applications(status);
CREATE INDEX IF NOT EXISTS idx_alpha_applications_email ON public.alpha_applications(email);
CREATE INDEX IF NOT EXISTS idx_alpha_applications_created_at ON public.alpha_applications(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.alpha_applications ENABLE ROW LEVEL SECURITY;

-- Policy: Allow anyone to submit alpha applications (INSERT)
CREATE POLICY "Anyone can submit alpha applications"
  ON public.alpha_applications FOR INSERT
  WITH CHECK (true);

-- Policy: Admins can view all alpha applications (SELECT)
CREATE POLICY "Admins can view alpha applications"
  ON public.alpha_applications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Policy: Admins can update application status
CREATE POLICY "Admins can update alpha applications"
  ON public.alpha_applications FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_alpha_applications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_alpha_applications_updated_at
    BEFORE UPDATE ON public.alpha_applications
    FOR EACH ROW
    EXECUTE FUNCTION update_alpha_applications_updated_at();

-- Grant permissions
GRANT INSERT ON public.alpha_applications TO anon;
GRANT SELECT, UPDATE ON public.alpha_applications TO authenticated;
GRANT ALL ON public.alpha_applications TO service_role;

-- Add comment for documentation
COMMENT ON TABLE public.alpha_applications IS 'Stores alpha testing applications from potential playtesters';
