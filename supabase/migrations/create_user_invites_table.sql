-- Create user_invites table for admin-initiated user invitations
-- Run this migration in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.user_invites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin', 'moderator')),
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  invited_by_email TEXT,
  message TEXT,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  accepted_at TIMESTAMPTZ,
  accepted_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_user_invites_token ON public.user_invites(token);
CREATE INDEX IF NOT EXISTS idx_user_invites_email ON public.user_invites(LOWER(email));
CREATE INDEX IF NOT EXISTS idx_user_invites_invited_by ON public.user_invites(invited_by);
CREATE INDEX IF NOT EXISTS idx_user_invites_created_at ON public.user_invites(created_at DESC);

-- Prevent multiple active invites for the same email
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_invites_active_email
  ON public.user_invites(LOWER(email))
  WHERE accepted_at IS NULL AND revoked_at IS NULL;

ALTER TABLE public.user_invites ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS, so the API routes (which use the service-role key)
-- can manage invites freely. Authenticated clients have no direct access.
CREATE POLICY "Admins can view invites"
  ON public.user_invites FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

COMMENT ON TABLE public.user_invites IS 'Admin-issued invitations. Tokens are single-use; service-role API routes manage lifecycle.';
