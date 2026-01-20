-- Migration: Create Password Reset and Magic Link Tokens
-- Created: 2026-01-20
-- Purpose: Enable password reset and passwordless magic sign-in functionality

-- Create auth_tokens table for password resets and magic links
CREATE TABLE IF NOT EXISTS public.auth_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  token_type TEXT NOT NULL CHECK (token_type IN ('password_reset', 'magic_link')),
  email TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT
);

-- Create index for faster token lookups
CREATE INDEX IF NOT EXISTS idx_auth_tokens_token ON public.auth_tokens(token);
CREATE INDEX IF NOT EXISTS idx_auth_tokens_user_id ON public.auth_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_tokens_expires_at ON public.auth_tokens(expires_at);

-- Create index for cleanup queries
CREATE INDEX IF NOT EXISTS idx_auth_tokens_type_expires ON public.auth_tokens(token_type, expires_at);

-- Enable Row Level Security
ALTER TABLE public.auth_tokens ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Only allow service role to manage tokens (no direct user access)
CREATE POLICY "Service role can manage all auth tokens"
  ON public.auth_tokens
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Function to clean up expired tokens (run via cron or manually)
CREATE OR REPLACE FUNCTION public.cleanup_expired_auth_tokens()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.auth_tokens
  WHERE expires_at < NOW()
    OR (used_at IS NOT NULL AND used_at < NOW() - INTERVAL '7 days');

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to service role
GRANT EXECUTE ON FUNCTION public.cleanup_expired_auth_tokens() TO service_role;

-- Add comment for documentation
COMMENT ON TABLE public.auth_tokens IS 'Stores temporary tokens for password resets and magic sign-in links';
COMMENT ON COLUMN public.auth_tokens.token IS 'Secure random token (hashed or cryptographically secure)';
COMMENT ON COLUMN public.auth_tokens.token_type IS 'Type of token: password_reset or magic_link';
COMMENT ON COLUMN public.auth_tokens.expires_at IS 'Token expiration time (15 min for magic links, 1 hour for password resets)';
COMMENT ON COLUMN public.auth_tokens.used_at IS 'Timestamp when token was used (prevents reuse)';
