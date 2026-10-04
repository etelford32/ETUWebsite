-- ACCOUNT-01 phase 0: harden public.profiles before game sign-in builds on it.
--
-- 1. anon/authenticated had table-wide INSERT/UPDATE/DELETE/TRUNCATE grants.
--    With the "update own profile" policy that let any signed-in user PATCH
--    their own role, status, is_alpha_tester, steam_id and stats through
--    PostgREST. Every website write goes through service-role API routes, so
--    clients keep SELECT (still filtered by RLS) and may UPDATE only cosmetic
--    columns. username/steam_id/role/status/stats change server-side only.
-- 2. handle_new_user derived username from the email local part, so a second
--    "john@..." signup collided with idx_profiles_username_unique and aborted
--    the whole signup. A taken or absent username is now stored as NULL and
--    claimed later; steam_id and signup_method come from server-only
--    app_metadata (set by the steam-session Edge Function).
-- 3. New profiles are private by default. Existing rows are unchanged.

-- 1. Column-scoped client privileges ----------------------------------------
revoke all on table public.profiles from anon, authenticated;
grant select on table public.profiles to anon, authenticated;
grant update (display_name, avatar_url, newsletter, is_public, faction_choice)
  on table public.profiles to authenticated;

-- 2. Signup trigger that cannot fail on a username collision ------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_username text := nullif(btrim(new.raw_user_meta_data->>'username'), '');
  v_steam_id text := new.raw_app_meta_data->>'steam_id';
  v_display  text;
begin
  if v_steam_id is not null and v_steam_id !~ '^[0-9]{17}$' then
    v_steam_id := null;
  end if;

  if v_username is not null and exists (
    select 1 from public.profiles p where lower(p.username) = lower(v_username)
  ) then
    v_username := null;
  end if;

  v_display := coalesce(
    v_username,
    nullif(btrim(new.raw_user_meta_data->>'persona_name'), ''),
    nullif(btrim(new.raw_user_meta_data->>'full_name'), ''),
    nullif(btrim(new.raw_user_meta_data->>'name'), ''),
    case when v_steam_id is null then split_part(new.email, '@', 1) end,
    'Commander'
  );

  begin
    insert into public.profiles (id, email, username, display_name, avatar_url, steam_id, signup_method)
    values (
      new.id, new.email, v_username, v_display,
      new.raw_user_meta_data->>'avatar_url',
      v_steam_id,
      -- NULL for website signups, so the auth_events trigger still records
      -- the real method (password / magic_link / ...) via COALESCE.
      new.raw_app_meta_data->>'signup_method'
    );
  exception when unique_violation then
    -- Lost a race for the username: keep the signup, drop the username.
    -- A duplicate email or steam_id still fails on this second insert.
    insert into public.profiles (id, email, username, display_name, avatar_url, steam_id, signup_method)
    values (
      new.id, new.email, null, v_display,
      new.raw_user_meta_data->>'avatar_url',
      v_steam_id,
      new.raw_app_meta_data->>'signup_method'
    );
  end;

  return new;
end;
$$;

-- 3. Private by default ------------------------------------------------------
alter table public.profiles alter column is_public set default false;

-- handle_new_user is a trigger function, not an RPC: keep it off
-- /rest/v1/rpc for clients, and leave GoTrue's role able to fire it.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
grant execute on function public.handle_new_user() to supabase_auth_admin;
