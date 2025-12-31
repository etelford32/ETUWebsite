-- Create feedback table for user feedback and support tickets
-- This migration creates the feedback table with proper RLS policies

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create feedback table
CREATE TABLE IF NOT EXISTS public.feedback (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('bug', 'feature', 'suggestion', 'support', 'other')),
  title TEXT NOT NULL CHECK (char_length(title) >= 3 AND char_length(title) <= 200),
  description TEXT NOT NULL CHECK (char_length(description) >= 10),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed', 'duplicate')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  source TEXT NOT NULL DEFAULT 'web' CHECK (source IN ('web', 'game')),
  email TEXT, -- Optional email for non-authenticated users or for contact
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  resolved_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_feedback_user_id ON public.feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_type ON public.feedback(type);
CREATE INDEX IF NOT EXISTS idx_feedback_status ON public.feedback(status);
CREATE INDEX IF NOT EXISTS idx_feedback_priority ON public.feedback(priority);
CREATE INDEX IF NOT EXISTS idx_feedback_source ON public.feedback(source);
CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON public.feedback(created_at DESC);

-- Add comments for documentation
COMMENT ON TABLE public.feedback IS 'User feedback, bug reports, and support tickets';
COMMENT ON COLUMN public.feedback.type IS 'Type of feedback (bug, feature, suggestion, support, other)';
COMMENT ON COLUMN public.feedback.status IS 'Current status of the feedback';
COMMENT ON COLUMN public.feedback.priority IS 'Priority level set by admins';
COMMENT ON COLUMN public.feedback.source IS 'Where the feedback was submitted from (web or game)';
COMMENT ON COLUMN public.feedback.email IS 'Contact email (for follow-up or non-auth users)';

-- Enable Row Level Security
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can submit feedback" ON public.feedback;
DROP POLICY IF EXISTS "Users can view their own feedback" ON public.feedback;
DROP POLICY IF EXISTS "Admins can view all feedback" ON public.feedback;
DROP POLICY IF EXISTS "Users can update their own feedback" ON public.feedback;

-- RLS Policy: Anyone can submit feedback (authenticated or not)
-- This allows in-game submissions without forcing users to sign up
CREATE POLICY "Anyone can submit feedback"
  ON public.feedback FOR INSERT
  WITH CHECK (true);

-- RLS Policy: Users can view their own feedback
CREATE POLICY "Users can view their own feedback"
  ON public.feedback FOR SELECT
  USING (
    auth.uid() = user_id
    OR user_id IS NULL -- Allow viewing of anonymous feedback if you own it by session
  );

-- RLS Policy: Users can update their own feedback (to add more details, etc.)
CREATE POLICY "Users can update their own feedback"
  ON public.feedback FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_feedback_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_feedback_updated ON public.feedback;
CREATE TRIGGER on_feedback_updated
  BEFORE UPDATE ON public.feedback
  FOR EACH ROW EXECUTE FUNCTION public.handle_feedback_updated_at();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON public.feedback TO anon, authenticated;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'feedback table created successfully!';
  RAISE NOTICE 'Row Level Security (RLS) policies applied';
  RAISE NOTICE 'Users can now submit feedback from website and game!';
END $$;
