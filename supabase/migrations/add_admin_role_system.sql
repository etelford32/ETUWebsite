-- Add admin role system to profiles table
-- This migration adds role-based access control for admin functionality

-- Add role column to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user'
  CHECK (role IN ('user', 'admin', 'moderator'));

-- Create index on role for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.role IS 'User role: user (default), admin, moderator';

-- Drop existing overly permissive policy
DROP POLICY IF EXISTS "Authenticated users can view all feedback" ON public.feedback;
DROP POLICY IF EXISTS "Authenticated users can update feedback" ON public.feedback;

-- Create new policy: Users can view their own feedback
CREATE POLICY "Users can view their own feedback"
  ON public.feedback FOR SELECT
  USING (
    auth.uid() = user_id
    OR user_id IS NULL -- Anonymous feedback
  );

-- Create new policy: Admins and moderators can view all feedback
CREATE POLICY "Admins can view all feedback"
  ON public.feedback FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'moderator')
    )
  );

-- Create policy: Only admins can update feedback
CREATE POLICY "Admins can update feedback"
  ON public.feedback FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'moderator')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'moderator')
    )
  );

-- Create policy: Admins can delete feedback
CREATE POLICY "Admins can delete feedback"
  ON public.feedback FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Create function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = user_id
    AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to check if user is admin or moderator
CREATE OR REPLACE FUNCTION public.is_staff(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = user_id
    AND role IN ('admin', 'moderator')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION public.is_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_staff(UUID) TO authenticated;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Admin role system created successfully!';
  RAISE NOTICE 'Added role column to profiles table (user, admin, moderator)';
  RAISE NOTICE 'Updated RLS policies to enforce role-based access';
  RAISE NOTICE 'Created helper functions: is_admin() and is_staff()';
  RAISE NOTICE '';
  RAISE NOTICE 'IMPORTANT: To grant admin access to a user, run:';
  RAISE NOTICE 'UPDATE public.profiles SET role = ''admin'' WHERE id = ''USER_UUID'';';
END $$;
