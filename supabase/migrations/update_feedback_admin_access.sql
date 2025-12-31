-- Update feedback RLS policies to allow admin access
-- This migration adds admin viewing capabilities

-- Drop existing "view own feedback" policy
DROP POLICY IF EXISTS "Users can view their own feedback" ON public.feedback;

-- Create new policy: Users can view their own feedback OR admins can view all
CREATE POLICY "Users can view their own feedback or admins can view all"
  ON public.feedback FOR SELECT
  USING (
    auth.uid() = user_id
    OR user_id IS NULL -- Anonymous feedback
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      -- TODO: Add admin role check here when you add role column to profiles
      -- AND profiles.role = 'admin'
    )
  );

-- For now, allow all authenticated users to view all feedback (temporary admin access)
-- This should be restricted later with proper role-based access control
DROP POLICY IF EXISTS "Users can view their own feedback or admins can view all" ON public.feedback;
CREATE POLICY "Authenticated users can view all feedback"
  ON public.feedback FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Allow authenticated users to update feedback (for admin dashboard)
-- TODO: Restrict this to admin users only
CREATE POLICY "Authenticated users can update feedback"
  ON public.feedback FOR UPDATE
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Admin access policies updated for feedback table';
  RAISE NOTICE 'WARNING: Current implementation allows all authenticated users to view/edit feedback';
  RAISE NOTICE 'TODO: Add role-based access control with admin role in profiles table';
END $$;
