-- Add privacy settings to profiles table
-- Migration: Add is_public field for profile visibility control

-- Add is_public column to profiles table (defaults to true for backward compatibility)
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT true;

-- Add index for faster queries filtering by public profiles
CREATE INDEX IF NOT EXISTS idx_profiles_is_public ON profiles(is_public);

-- Comment on the new column
COMMENT ON COLUMN profiles.is_public IS 'Controls whether the profile is visible to other users. Admins can always view all profiles.';

-- Update RLS policy to respect privacy settings
-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;

-- Create new policy that respects privacy settings
CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles FOR SELECT
  USING (
    is_public = true
    OR auth.uid() = id
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'moderator')
    )
  );

-- Ensure users can update their own privacy settings
-- The existing update policy should allow this, but let's verify
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Grant necessary permissions
GRANT SELECT ON profiles TO authenticated;
GRANT SELECT ON profiles TO anon;
GRANT UPDATE ON profiles TO authenticated;
