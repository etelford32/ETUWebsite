-- ETU 2175 Supabase Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE,
  steam_id TEXT UNIQUE,
  avatar_url TEXT,
  faction_choice TEXT CHECK (faction_choice IN ('crystal', 'mycelari', 'megabot', 'wild', NULL)),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Player scores table
CREATE TABLE IF NOT EXISTS public.player_scores (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  score INTEGER NOT NULL CHECK (score >= 0),
  mode TEXT NOT NULL, -- 'speedrun', 'survival', 'discovery', etc.
  platform TEXT NOT NULL CHECK (platform IN ('PC', 'Mac', 'Linux', 'PS', 'Xbox', 'Switch')),
  level INTEGER DEFAULT 1 CHECK (level > 0),
  time_seconds INTEGER CHECK (time_seconds >= 0),
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  is_verified BOOLEAN DEFAULT false NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_scores_user_id ON public.player_scores(user_id);
CREATE INDEX IF NOT EXISTS idx_scores_submitted_at ON public.player_scores(submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_scores_score ON public.player_scores(score DESC);
CREATE INDEX IF NOT EXISTS idx_scores_mode ON public.player_scores(mode);
CREATE INDEX IF NOT EXISTS idx_scores_verified ON public.player_scores(is_verified) WHERE is_verified = true;
CREATE INDEX IF NOT EXISTS idx_profiles_steam_id ON public.profiles(steam_id) WHERE steam_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_scores ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Public profiles are viewable by everyone"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- RLS Policies for player_scores
CREATE POLICY "Scores are viewable by everyone"
  ON public.player_scores FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert scores"
  ON public.player_scores FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Function to automatically create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at on profiles
DROP TRIGGER IF EXISTS on_profile_updated ON public.profiles;
CREATE TRIGGER on_profile_updated
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Insert some demo data for testing (optional)
-- You can comment this out after initial setup
INSERT INTO public.profiles (id, username, avatar_url, faction_choice)
SELECT
  uuid_generate_v4(),
  'DemoPlayer' || generate_series,
  'https://api.dicebear.com/8.x/identicon/svg?seed=demo' || generate_series,
  CASE (generate_series % 4)
    WHEN 0 THEN 'crystal'
    WHEN 1 THEN 'mycelari'
    WHEN 2 THEN 'megabot'
    ELSE 'wild'
  END
FROM generate_series(1, 10)
ON CONFLICT (id) DO NOTHING;

-- Grant permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.profiles TO anon, authenticated;
GRANT ALL ON public.player_scores TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'ETU 2175 database schema created successfully!';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Test the API routes: /api/leaderboard and /api/submit-score';
  RAISE NOTICE '2. Update your .env.local with SUPABASE_SERVICE_ROLE_KEY';
  RAISE NOTICE '3. Configure Steam OAuth in Supabase dashboard';
END $$;
