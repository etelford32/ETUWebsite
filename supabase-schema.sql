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

-- Ship designs table (for ship designer feature)
CREATE TABLE IF NOT EXISTS public.ship_designs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  ship_name TEXT NOT NULL,
  ship_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ship_designs_user_id ON public.ship_designs(user_id);

ALTER TABLE public.ship_designs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ship designs are viewable by everyone"
  ON public.ship_designs FOR SELECT
  USING (true);

CREATE POLICY "Users can insert own ship designs"
  ON public.ship_designs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own ship designs"
  ON public.ship_designs FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own ship designs"
  ON public.ship_designs FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger to update updated_at on ship_designs
DROP TRIGGER IF EXISTS on_ship_design_updated ON public.ship_designs;
CREATE TRIGGER on_ship_design_updated
  BEFORE UPDATE ON public.ship_designs
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Backlog items table (for feature requests and bug reports)
CREATE TABLE IF NOT EXISTS public.backlog_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('feature', 'bug')),
  title TEXT NOT NULL CHECK (char_length(title) >= 3 AND char_length(title) <= 200),
  description TEXT NOT NULL CHECK (char_length(description) >= 10),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'completed', 'wont_fix', 'duplicate')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  tags TEXT[] DEFAULT '{}',
  vote_count INTEGER DEFAULT 0 NOT NULL,
  source TEXT DEFAULT 'web' CHECK (source IN ('web', 'game')),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Backlog votes table (for tracking user votes on backlog items)
CREATE TABLE IF NOT EXISTS public.backlog_votes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  backlog_item_id UUID REFERENCES public.backlog_items(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(backlog_item_id, user_id)
);

-- Indexes for backlog performance
CREATE INDEX IF NOT EXISTS idx_backlog_items_user_id ON public.backlog_items(user_id);
CREATE INDEX IF NOT EXISTS idx_backlog_items_type ON public.backlog_items(type);
CREATE INDEX IF NOT EXISTS idx_backlog_items_status ON public.backlog_items(status);
CREATE INDEX IF NOT EXISTS idx_backlog_items_priority ON public.backlog_items(priority);
CREATE INDEX IF NOT EXISTS idx_backlog_items_vote_count ON public.backlog_items(vote_count DESC);
CREATE INDEX IF NOT EXISTS idx_backlog_items_created_at ON public.backlog_items(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_backlog_votes_item_id ON public.backlog_votes(backlog_item_id);
CREATE INDEX IF NOT EXISTS idx_backlog_votes_user_id ON public.backlog_votes(user_id);

-- Enable Row Level Security for backlog
ALTER TABLE public.backlog_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backlog_votes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for backlog_items
CREATE POLICY "Backlog items are viewable by everyone"
  ON public.backlog_items FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert backlog items"
  ON public.backlog_items FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update own backlog items"
  ON public.backlog_items FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for backlog_votes
CREATE POLICY "Backlog votes are viewable by everyone"
  ON public.backlog_votes FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert backlog votes"
  ON public.backlog_votes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own backlog votes"
  ON public.backlog_votes FOR DELETE
  USING (auth.uid() = user_id);

-- Function to update vote count on backlog items
CREATE OR REPLACE FUNCTION public.update_backlog_vote_count()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    UPDATE public.backlog_items
    SET vote_count = vote_count + 1
    WHERE id = NEW.backlog_item_id;
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE public.backlog_items
    SET vote_count = GREATEST(vote_count - 1, 0)
    WHERE id = OLD.backlog_item_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update vote count
DROP TRIGGER IF EXISTS on_backlog_vote_changed ON public.backlog_votes;
CREATE TRIGGER on_backlog_vote_changed
  AFTER INSERT OR DELETE ON public.backlog_votes
  FOR EACH ROW EXECUTE FUNCTION public.update_backlog_vote_count();

-- Trigger to update updated_at on backlog_items
DROP TRIGGER IF EXISTS on_backlog_item_updated ON public.backlog_items;
CREATE TRIGGER on_backlog_item_updated
  BEFORE UPDATE ON public.backlog_items
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Grant permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.profiles TO anon, authenticated;
GRANT ALL ON public.player_scores TO anon, authenticated;
GRANT ALL ON public.ship_designs TO anon, authenticated;
GRANT ALL ON public.backlog_items TO anon, authenticated;
GRANT ALL ON public.backlog_votes TO anon, authenticated;
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
