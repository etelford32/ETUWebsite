-- Create player_scores table for leaderboard system
-- This migration creates the player scores table with proper RLS policies

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create player_scores table
CREATE TABLE IF NOT EXISTS public.player_scores (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  score INTEGER NOT NULL CHECK (score >= 0),
  mode TEXT NOT NULL CHECK (mode IN ('speedrun', 'survival', 'discovery', 'boss_rush', 'global')),
  platform TEXT NOT NULL CHECK (platform IN ('PC', 'Mac', 'Linux', 'PS', 'Xbox', 'Switch')),
  level INTEGER DEFAULT 1 CHECK (level > 0),
  time_seconds INTEGER CHECK (time_seconds >= 0),
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  is_verified BOOLEAN DEFAULT false NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_scores_user_id ON public.player_scores(user_id);
CREATE INDEX IF NOT EXISTS idx_scores_submitted_at ON public.player_scores(submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_scores_score ON public.player_scores(score DESC);
CREATE INDEX IF NOT EXISTS idx_scores_mode ON public.player_scores(mode);
CREATE INDEX IF NOT EXISTS idx_scores_verified ON public.player_scores(is_verified) WHERE is_verified = true;

-- Add comments for documentation
COMMENT ON TABLE public.player_scores IS 'Player scores for leaderboard system';
COMMENT ON COLUMN public.player_scores.score IS 'Player score value';
COMMENT ON COLUMN public.player_scores.mode IS 'Game mode (speedrun, survival, discovery, boss_rush, global)';
COMMENT ON COLUMN public.player_scores.platform IS 'Gaming platform';
COMMENT ON COLUMN public.player_scores.is_verified IS 'Whether the score has been verified (prevents cheating)';

-- Enable Row Level Security
ALTER TABLE public.player_scores ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Scores are viewable by everyone" ON public.player_scores;
DROP POLICY IF EXISTS "Authenticated users can insert scores" ON public.player_scores;
DROP POLICY IF EXISTS "Users can view their own unverified scores" ON public.player_scores;

-- RLS Policy: Everyone can view verified scores
CREATE POLICY "Scores are viewable by everyone"
  ON public.player_scores FOR SELECT
  USING (is_verified = true);

-- RLS Policy: Users can view their own unverified scores
CREATE POLICY "Users can view their own unverified scores"
  ON public.player_scores FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policy: Authenticated users can insert their own scores
CREATE POLICY "Authenticated users can insert scores"
  ON public.player_scores FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND auth.uid() IS NOT NULL
  );

-- Grant permissions
GRANT SELECT ON public.player_scores TO anon;
GRANT SELECT, INSERT ON public.player_scores TO authenticated;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'player_scores table created successfully!';
  RAISE NOTICE 'Row Level Security (RLS) policies applied';
  RAISE NOTICE 'Table is ready for leaderboard integration';
END $$;
