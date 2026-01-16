-- ETU 2175 Forms Migration - Career Applications & Investor Inquiries
-- Run this in your Supabase SQL Editor to add forms support
-- This adds support for career applications and investor inquiries

-- Career Applications table
CREATE TABLE IF NOT EXISTS public.career_applications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL CHECK (char_length(name) >= 2),
  email TEXT NOT NULL CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  position TEXT NOT NULL CHECK (position IN (
    'Game Developer',
    '3D Artist',
    'UI/UX Designer',
    'Sound Designer',
    'Community Manager',
    'QA Tester',
    'Other'
  )),
  portfolio TEXT, -- Optional URL for portfolio/LinkedIn
  message TEXT NOT NULL CHECK (char_length(message) >= 20),
  resume_url TEXT, -- Will store uploaded resume file path
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewing', 'interviewed', 'accepted', 'rejected')),
  notes TEXT, -- Admin notes
  metadata JSONB DEFAULT '{}'::jsonb, -- For additional data like resume file name, size, etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Investor Inquiries table
CREATE TABLE IF NOT EXISTS public.investor_inquiries (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL CHECK (char_length(name) >= 2),
  email TEXT NOT NULL CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  phone TEXT NOT NULL CHECK (char_length(phone) >= 10),
  company TEXT, -- Optional company/fund name
  investment_range TEXT NOT NULL CHECK (investment_range IN (
    'Less than $50K',
    '$50K - $100K',
    '$100K - $500K',
    '$500K - $1M',
    '$1M - $5M',
    '$5M+',
    'Prefer not to say'
  )),
  message TEXT NOT NULL CHECK (char_length(message) >= 20),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'contacted', 'meeting_scheduled', 'interested', 'not_interested')),
  notes TEXT, -- Admin notes
  metadata JSONB DEFAULT '{}'::jsonb, -- For additional tracking data
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_career_applications_status ON public.career_applications(status);
CREATE INDEX IF NOT EXISTS idx_career_applications_position ON public.career_applications(position);
CREATE INDEX IF NOT EXISTS idx_career_applications_created_at ON public.career_applications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_career_applications_email ON public.career_applications(email);

CREATE INDEX IF NOT EXISTS idx_investor_inquiries_status ON public.investor_inquiries(status);
CREATE INDEX IF NOT EXISTS idx_investor_inquiries_investment_range ON public.investor_inquiries(investment_range);
CREATE INDEX IF NOT EXISTS idx_investor_inquiries_created_at ON public.investor_inquiries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_investor_inquiries_email ON public.investor_inquiries(email);

-- Enable Row Level Security
ALTER TABLE public.career_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investor_inquiries ENABLE ROW LEVEL SECURITY;

-- RLS Policies for career_applications
-- Only authenticated service role (admin) can view all applications
CREATE POLICY "Service role can view all career applications"
  ON public.career_applications FOR SELECT
  TO service_role
  USING (true);

-- Anyone can submit a career application (no auth required)
CREATE POLICY "Anyone can submit career applications"
  ON public.career_applications FOR INSERT
  WITH CHECK (true);

-- Only service role can update applications (for status changes, notes)
CREATE POLICY "Service role can update career applications"
  ON public.career_applications FOR UPDATE
  TO service_role
  USING (true);

-- RLS Policies for investor_inquiries
-- Only authenticated service role (admin) can view all inquiries
CREATE POLICY "Service role can view all investor inquiries"
  ON public.investor_inquiries FOR SELECT
  TO service_role
  USING (true);

-- Anyone can submit an investor inquiry (no auth required)
CREATE POLICY "Anyone can submit investor inquiries"
  ON public.investor_inquiries FOR INSERT
  WITH CHECK (true);

-- Only service role can update inquiries (for status changes, notes)
CREATE POLICY "Service role can update investor inquiries"
  ON public.investor_inquiries FOR UPDATE
  TO service_role
  USING (true);

-- Trigger to update updated_at on career_applications
DROP TRIGGER IF EXISTS on_career_application_updated ON public.career_applications;
CREATE TRIGGER on_career_application_updated
  BEFORE UPDATE ON public.career_applications
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Trigger to update updated_at on investor_inquiries
DROP TRIGGER IF EXISTS on_investor_inquiry_updated ON public.investor_inquiries;
CREATE TRIGGER on_investor_inquiry_updated
  BEFORE UPDATE ON public.investor_inquiries
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Grant permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT ON public.career_applications TO anon, authenticated;
GRANT SELECT, INSERT ON public.investor_inquiries TO anon, authenticated;
GRANT ALL ON public.career_applications TO service_role;
GRANT ALL ON public.investor_inquiries TO service_role;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Forms migration completed successfully!';
  RAISE NOTICE 'Created tables:';
  RAISE NOTICE '  - career_applications (for job applications)';
  RAISE NOTICE '  - investor_inquiries (for investment inquiries)';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Create API routes: /api/careers and /api/investors';
  RAISE NOTICE '2. Update frontend forms to submit to these endpoints';
  RAISE NOTICE '3. Consider setting up email notifications for new submissions';
END $$;
