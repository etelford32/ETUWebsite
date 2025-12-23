-- Add player stats columns to profiles table
-- This migration adds game statistics tracking to the profiles table

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1 NOT NULL,
ADD COLUMN IF NOT EXISTS xp INTEGER DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS total_kills INTEGER DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS total_deaths INTEGER DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS total_wins INTEGER DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS total_losses INTEGER DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS total_playtime INTEGER DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS highest_score INTEGER DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS ship_class TEXT;

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_profiles_level ON profiles(level DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_highest_score ON profiles(highest_score DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_total_wins ON profiles(total_wins DESC);

-- Add comments for documentation
COMMENT ON COLUMN profiles.level IS 'Player current level';
COMMENT ON COLUMN profiles.xp IS 'Total experience points earned';
COMMENT ON COLUMN profiles.total_kills IS 'Total enemy ships destroyed';
COMMENT ON COLUMN profiles.total_deaths IS 'Total times player ship was destroyed';
COMMENT ON COLUMN profiles.total_wins IS 'Total victories/successful runs';
COMMENT ON COLUMN profiles.total_losses IS 'Total defeats/failed runs';
COMMENT ON COLUMN profiles.total_playtime IS 'Total playtime in seconds';
COMMENT ON COLUMN profiles.highest_score IS 'Highest score achieved in any run';
COMMENT ON COLUMN profiles.ship_class IS 'Currently selected ship class';
