-- Align the live `profiles` table with the columns the app code reads.
-- The deployed schema drifted to an auth/telemetry shape (display_name,
-- role, login_count, …) and lost the game-profile columns that the
-- profile page, dashboard, Steam link, and public-profile pages depend on.
-- All additions are nullable/defaulted, so existing rows are unaffected.

alter table public.profiles
  add column if not exists username       text,
  add column if not exists avatar_url     text,
  add column if not exists steam_id       text,
  add column if not exists faction_choice text,
  add column if not exists is_public      boolean not null default true,
  add column if not exists updated_at      timestamptz not null default timezone('utc', now());

-- Faction is one of the four playable factions (or unset).
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_faction_choice_check'
  ) then
    alter table public.profiles
      add constraint profiles_faction_choice_check
      check (faction_choice is null or faction_choice in ('crystal', 'mycelari', 'megabot', 'wild'));
  end if;
end $$;

-- Give existing users a sensible display name so the UI isn't blank.
update public.profiles
set username = coalesce(username, display_name, split_part(email, '@', 1))
where username is null;

-- Uniqueness where present (multiple NULLs are allowed by partial indexes).
create unique index if not exists idx_profiles_username_unique
  on public.profiles (lower(username)) where username is not null;
create unique index if not exists idx_profiles_steam_id_unique
  on public.profiles (steam_id) where steam_id is not null;

-- Populate username on new signups. Mirrors display_name so both the
-- newer auth code and the older profile code see a name.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, username, display_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;
