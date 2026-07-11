-- Read-only RLS policy inventory for the admin security page.
-- SECURITY DEFINER so the service-role API can enumerate policies on public
-- tables without granting broad catalog access. Returns no row data — only
-- policy metadata.
create or replace function public.admin_list_rls_policies()
returns table (
  table_name  text,
  policy_name text,
  command     text,
  rls_enabled boolean
)
language sql
security definer
set search_path = public, pg_catalog
as $$
  select
    p.tablename::text as table_name,
    p.policyname::text as policy_name,
    p.cmd::text as command,
    c.relrowsecurity as rls_enabled
  from pg_policies p
  join pg_class c on c.relname = p.tablename
  join pg_namespace n on n.oid = c.relnamespace and n.nspname = p.schemaname
  where p.schemaname = 'public'
  order by p.tablename, p.policyname;
$$;
