-- LEADERBOARD-00 follow-up: deleting a run takes it off Steam too.
--
-- Steam's boards are KeepBest copies of player_scores. Deleting a row (from
-- the Supabase dashboard, SQL, or by deleting the account) left its Steam
-- entry in place, so a removed cheat score stayed on Steam forever.
--
-- Any change that takes a run off the website's boards now queues a removal
-- for each Steam board that run was written to:
--   - the row is deleted,
--   - it is un-verified (is_verified true -> false),
--   - its boards are cleared,
--   - the account is deleted (profiles cascade to player_scores).
-- /api/cron/steam-leaderboard-sync drains the queue: it deletes the player's
-- Steam entry on that board, then re-posts their best remaining eligible run
-- (if any), since one Steam entry stands for all of a player's runs.

create table if not exists public.steam_leaderboard_removals (
  id          bigserial primary key,
  user_id     uuid not null,
  steam_id    text not null,
  board       text not null,
  reason      text not null,
  attempts    integer not null default 0,
  last_error  text,
  created_at  timestamptz not null default now(),
  done_at     timestamptz
);

-- One pending removal per Steam entry is enough: the processor re-reads
-- what remains when it runs.
create unique index if not exists idx_steam_removals_pending
  on public.steam_leaderboard_removals (steam_id, board)
  where done_at is null;

alter table public.steam_leaderboard_removals enable row level security;
revoke all on public.steam_leaderboard_removals from anon, authenticated;
comment on table public.steam_leaderboard_removals is
  'LEADERBOARD-00: Steam leaderboard entries to delete (and re-post from the best remaining run). Service role only.';

-- Only runs that may have reached Steam: verified, with boards, and at
-- least one sync attempt (a partial failure may still have written some).
create or replace function public.queue_steam_removals_for_run()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_steam_id text;
  v_reason   text;
begin
  if not (old.is_verified
          and cardinality(old.steam_leaderboards) > 0
          and (old.steam_synced_at is not null or old.steam_sync_attempts > 0)) then
    return null;
  end if;

  if tg_op = 'DELETE' then
    v_reason := 'run deleted';
  elsif not new.is_verified then
    v_reason := 'run unverified';
  elsif not (old.steam_leaderboards <@ new.steam_leaderboards) then
    v_reason := 'run boards changed';
  else
    return null;
  end if;

  -- During an account delete the profile is already gone; the profiles
  -- trigger below has queued that account's removals.
  select p.steam_id into v_steam_id from public.profiles p where p.id = old.user_id;
  if v_steam_id is null then
    return null;
  end if;

  insert into public.steam_leaderboard_removals (user_id, steam_id, board, reason)
  select old.user_id, v_steam_id, b, v_reason
    from unnest(old.steam_leaderboards) as b
   where tg_op = 'DELETE'
      or not new.is_verified
      or not (b = any (new.steam_leaderboards))
  on conflict (steam_id, board) where done_at is null do nothing;

  return null;
end;
$$;

drop trigger if exists trg_player_scores_steam_removal on public.player_scores;
create trigger trg_player_scores_steam_removal
  after delete or update of is_verified, steam_leaderboards on public.player_scores
  for each row execute function public.queue_steam_removals_for_run();

create or replace function public.queue_steam_removals_for_account()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.steam_id is null then
    return old;
  end if;

  insert into public.steam_leaderboard_removals (user_id, steam_id, board, reason)
  select distinct old.id, old.steam_id, b, 'account deleted'
    from public.player_scores s, unnest(s.steam_leaderboards) as b
   where s.user_id = old.id
     and s.is_verified
     and (s.steam_synced_at is not null or s.steam_sync_attempts > 0)
  on conflict (steam_id, board) where done_at is null do nothing;

  return old;
end;
$$;

drop trigger if exists trg_profiles_steam_removal on public.profiles;
create trigger trg_profiles_steam_removal
  before delete on public.profiles
  for each row execute function public.queue_steam_removals_for_account();

revoke all on function public.queue_steam_removals_for_run() from public, anon, authenticated;
revoke all on function public.queue_steam_removals_for_account() from public, anon, authenticated;
