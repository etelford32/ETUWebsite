-- Steam purchase verification (auth-flow.md §9).
--
-- After any Steam auth (website sign-in, link, or game sign-in) the server
-- asks Steam's partner API whether the Steam ID owns App 4094340 and stores
-- the answer here. These columns are server-written only: the phase-0
-- hardening limited client UPDATE to cosmetic columns, so nothing more is
-- needed to keep players from self-verifying.

alter table public.profiles
  add column if not exists is_verified_owner          boolean not null default false,
  add column if not exists steam_purchase_verified_at timestamptz,
  add column if not exists steam_ownership_checked_at timestamptz;

comment on column public.profiles.is_verified_owner is
  'Steam CheckAppOwnership said this Steam ID owns the game (incl. family sharing) at the last check.';
comment on column public.profiles.steam_purchase_verified_at is
  'First time ownership was confirmed; cleared when Steam is unlinked.';
comment on column public.profiles.steam_ownership_checked_at is
  'Last time Steam answered an ownership check, whatever the answer.';

create index if not exists idx_profiles_verified_owner
  on public.profiles (is_verified_owner) where is_verified_owner;

-- Expose the badge to the game. Keeps every field TIER-01 added
-- (20261026_tier01_account_tiers.sql); this must stay a superset.
create or replace function public.get_my_profile()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
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
    'tier', p.tier,
    'is_verified_owner', p.is_verified_owner,
    'steam_purchase_verified_at', p.steam_purchase_verified_at
  )
  from public.profiles p
  where p.id = auth.uid();
$$;
