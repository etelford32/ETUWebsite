-- Hardening for telemetry / automation functions.
--
-- These functions are SECURITY DEFINER and run either server-side via the
-- service role or as triggers — never from the public PostgREST API. We:
--   * pin search_path (every body is fully schema-qualified already), and
--   * revoke RPC execute from anon/authenticated so they can't be called
--     directly via /rest/v1/rpc/*.
--
-- Resolves Supabase linter warnings 0011 (mutable search_path),
-- 0028 / 0029 (anon / authenticated can execute SECURITY DEFINER function).

ALTER FUNCTION public.apply_auth_event_to_profile() SET search_path = '';
ALTER FUNCTION public.end_user_session(text) SET search_path = '';
ALTER FUNCTION public.increment_session_pageview(text, text) SET search_path = '';
ALTER FUNCTION public.increment_session_events(text) SET search_path = '';

REVOKE ALL ON FUNCTION public.apply_auth_event_to_profile() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.end_user_session(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.increment_session_pageview(text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.increment_session_events(text) FROM PUBLIC, anon, authenticated;
