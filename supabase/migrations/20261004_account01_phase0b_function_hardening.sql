-- ACCOUNT-01 phase 0b: clear the Supabase security advisor's function findings.
--
-- * Trigger and event-trigger functions are not RPCs. Revoking EXECUTE keeps
--   them off /rest/v1/rpc; triggers still fire (verified: a BEFORE INSERT
--   trigger fires for a role without EXECUTE on its function).
-- * admin_list_rls_policies exposed the full policy inventory to anyone with
--   the anon key. Only /api/admin/security calls it, with the service role.
-- * current_user_is_staff is referenced by RLS policies, so anon and
--   authenticated must keep EXECUTE (policy expressions run as the caller).
--   It returns only the caller's own staff bit; its advisor warning is
--   accepted as intentional. It gets a pinned search_path like the others.
-- * Every SECURITY DEFINER / trigger function now has a fixed search_path.
--   All bodies already schema-qualify their tables.

revoke execute on function public.queue_feedback_resolved_email() from public, anon, authenticated;
revoke execute on function public.update_backlog_vote_count()     from public, anon, authenticated;
revoke execute on function public.update_feedback_vote_count()    from public, anon, authenticated;
revoke execute on function public.update_updated_at_column()      from public, anon, authenticated;
revoke execute on function public.rls_auto_enable()               from public, anon, authenticated;

revoke execute on function public.admin_list_rls_policies() from public, anon, authenticated;
grant  execute on function public.admin_list_rls_policies() to service_role;

alter function public.queue_feedback_resolved_email() set search_path = '';
alter function public.update_backlog_vote_count()     set search_path = '';
alter function public.update_feedback_vote_count()    set search_path = '';
alter function public.update_updated_at_column()      set search_path = '';
alter function public.current_user_is_staff()         set search_path = '';
