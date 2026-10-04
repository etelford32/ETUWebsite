-- ACCOUNT-01 phase 1: the RPCs the game calls with the player's own JWT.
--
-- claim_username(p_username)  the first claim and the first rename (a typo
--                             fix) are free; later renames are limited to
--                             once per 30 days. Returns jsonb
--                             {ok:true, username} or {ok:false, error} where
--                             error is one of invalid | reserved | taken |
--                             rate_limited | no_profile | not_authenticated.
-- get_my_profile()            the identity fields the game shows.
--
-- Both are SECURITY DEFINER (profiles.username is no longer client-writable
-- after phase 0) and act only on auth.uid().

alter table public.profiles
  add column if not exists username_changed_at timestamptz;

create or replace function public.claim_username(p_username text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid      uuid := auth.uid();
  v_name     text := btrim(coalesce(p_username, ''));
  v_current  text;
  v_changed  timestamptz;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  if v_name !~ '^[A-Za-z0-9_-]{3,20}$' then
    return jsonb_build_object('ok', false, 'error', 'invalid');
  end if;

  if lower(v_name) = any (array[
       'admin', 'administrator', 'moderator', 'mod', 'staff', 'support',
       'system', 'root', 'null', 'undefined', 'anonymous', 'guest',
       'steam', 'valve', 'etu', 'etu2175', 'exploretheuniverse',
       'commander', 'official', 'developer', 'dev'
     ])
     or lower(v_name) like 'admin%'
     or lower(v_name) like 'etu_%'
     or lower(v_name) like 'etu-%' then
    return jsonb_build_object('ok', false, 'error', 'reserved');
  end if;

  select p.username, p.username_changed_at
    into v_current, v_changed
    from public.profiles p
   where p.id = v_uid
   for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'no_profile');
  end if;

  if v_current = v_name then
    return jsonb_build_object('ok', true, 'username', v_current);
  end if;

  -- A case-only change of your own name is not a collision.
  if exists (
    select 1 from public.profiles p
     where lower(p.username) = lower(v_name) and p.id <> v_uid
  ) then
    return jsonb_build_object('ok', false, 'error', 'taken');
  end if;

  if v_current is not null
     and v_changed is not null
     and v_changed > now() - interval '30 days' then
    return jsonb_build_object(
      'ok', false, 'error', 'rate_limited',
      'retry_after', v_changed + interval '30 days'
    );
  end if;

  begin
    update public.profiles
       set username = v_name,
           display_name = case
             when display_name is null or display_name = 'Commander'
               or display_name = v_current then v_name
             else display_name end,
           username_changed_at = case when v_current is null then null else now() end,
           updated_at = now()
     where id = v_uid;
  exception when unique_violation then
    return jsonb_build_object('ok', false, 'error', 'taken');
  end;

  return jsonb_build_object('ok', true, 'username', v_name);
end;
$$;

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
    'status', p.status
  )
  from public.profiles p
  where p.id = auth.uid();
$$;

revoke execute on function public.claim_username(text) from public, anon;
revoke execute on function public.get_my_profile()     from public, anon;
grant  execute on function public.claim_username(text) to authenticated;
grant  execute on function public.get_my_profile()     to authenticated;
