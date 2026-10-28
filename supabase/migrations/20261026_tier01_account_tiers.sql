-- TIER-01: account tiers (applied to the live project on 2026-10-26 as
-- migration 20261026232504_tier01_account_tiers; recorded here so the repo
-- matches production).
--
-- profiles.tier is generated from role, is_alpha_tester and is_superuser:
--   dev    superuser, dev, admin
--   alpha  alpha tester, staff, moderator
--   player everyone else
-- It decides which Steam branch (build profile) an account receives and
-- never unlocks anything inside a build.

alter table public.profiles drop constraint profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role = any (array['user', 'moderator', 'staff', 'admin', 'dev']));

alter table public.profiles
  add column tier text generated always as (
    case
      when is_superuser or role in ('dev', 'admin') then 'dev'
      when is_alpha_tester or role in ('staff', 'moderator') then 'alpha'
      else 'player'
    end
  ) stored;

comment on column public.profiles.tier is
  'TIER-01: player | alpha | dev, derived from role, is_alpha_tester and is_superuser. Decides which Steam branch (and so which build profile) an account receives. Never unlocks anything inside a build.';

create or replace function public.get_my_profile()
 returns jsonb
 language sql
 stable security definer
 set search_path to ''
as $function$
  select jsonb_build_object(
    'id', p.id,
    'username', p.username,
    'display_name', p.display_name,
    'avatar_url', p.avatar_url,
    'steam_id', p.steam_id,
    'faction_choice', p.faction_choice,
    'is_public', p.is_public,
    'needs_username', p.username is null,
    'status', p.status,
    'tier', p.tier
  )
  from public.profiles p
  where p.id = auth.uid();
$function$;
