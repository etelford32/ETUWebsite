-- Superuser console (/admin/superuser)
--
-- 1. profiles.is_superuser — a flag above every role. Superusers manage all
--    accounts, administrators included. Like role/status it is written only
--    by service-role API routes (clients have no UPDATE policy on profiles).
-- 2. Allow the 'staff' role the app already assigns and checks for.
-- 3. admin_audit_log — append-only record of every superuser action.
-- 4. Make the site owner the first superuser.

alter table public.profiles
  add column if not exists is_superuser boolean not null default false;

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check
  check (role = any (array['user', 'moderator', 'staff', 'admin']));

create table if not exists public.admin_audit_log (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  actor_id uuid references auth.users(id) on delete set null,
  actor_email text,
  target_id uuid,
  target_email text,
  action text not null,
  details jsonb not null default '{}'::jsonb
);

comment on table public.admin_audit_log is
  'Append-only log of superuser actions. Service-role API routes only.';

create index if not exists admin_audit_log_created_at_idx
  on public.admin_audit_log (created_at desc);

-- RLS on with no policies: only the service role can read or write.
alter table public.admin_audit_log enable row level security;

update public.profiles p
set is_superuser = true,
    role = 'admin'
from auth.users u
where u.id = p.id
  and lower(u.email) = 'etelford32@gmail.com';
