-- LEADERBOARD-00 phase 0: player_scores is written only by the server, and
-- the boards the game and Steam share are defined in one place.
--
-- 1. Lock down writes. authenticated (and anon) held every table privilege,
--    and the INSERT policy only checked auth.uid() = user_id, so any player
--    could insert a row with is_verified = true straight through PostgREST
--    and the "Verified scores are public" policy would publish it. Writes
--    now go only through service-role API routes (/api/submit-score,
--    /api/game/submit-run). Reads keep their existing RLS policies.
-- 2. Columns the game's runs carry: run_id (idempotent retries), difficulty,
--    game_version, and the Steam sync bookkeeping.
-- 3. steam_leaderboards caches Steam's numeric id for each board name.
-- 4. leaderboard_best / get_leaderboard / get_leaderboard_rank: one row per
--    player per board (their best verified run), ranked the way Steam ranks
--    a KeepBest board. Callers get only public profile fields.

-- 1 ── privileges ───────────────────────────────────────────────────────────

revoke all on public.player_scores from anon, authenticated;
grant select on public.player_scores to anon, authenticated;

drop policy if exists "Users can insert their own scores" on public.player_scores;

-- 2 ── columns ──────────────────────────────────────────────────────────────

alter table public.player_scores
  add column if not exists run_id uuid,
  add column if not exists difficulty text,
  add column if not exists game_version text,
  add column if not exists steam_leaderboards text[] not null default '{}',
  add column if not exists steam_synced_at timestamptz,
  add column if not exists steam_sync_error text,
  add column if not exists steam_sync_attempts integer not null default 0;

alter table public.player_scores drop constraint if exists player_scores_mode_check;
alter table public.player_scores add constraint player_scores_mode_check
  check (mode = any (array['speedrun', 'survival', 'coop_survival', 'discovery',
                           'boss_rush', 'megabot', 'global']));

alter table public.player_scores drop constraint if exists player_scores_difficulty_check;
alter table public.player_scores add constraint player_scores_difficulty_check
  check (difficulty is null or difficulty = any (array['easy', 'medium', 'hard', 'hardcore']));

-- NULL run_ids (browser Megabot runs) never collide: NULLs are distinct.
create unique index if not exists idx_scores_user_run
  on public.player_scores (user_id, run_id);

create index if not exists idx_scores_board
  on public.player_scores (mode, difficulty, score desc)
  where is_verified;

create index if not exists idx_scores_steam_pending
  on public.player_scores (submitted_at)
  where is_verified and steam_synced_at is null and cardinality(steam_leaderboards) > 0;

-- 3 ── Steam board ids ──────────────────────────────────────────────────────

create table if not exists public.steam_leaderboards (
  name           text primary key,
  leaderboard_id bigint not null,
  created_at     timestamptz not null default now()
);
alter table public.steam_leaderboards enable row level security;
revoke all on public.steam_leaderboards from anon, authenticated;
comment on table public.steam_leaderboards is
  'LEADERBOARD-00: Steam leaderboard id per board name, resolved by FindOrCreateLeaderboard. Service role only.';

-- 4 ── boards ───────────────────────────────────────────────────────────────

-- Every verified run each active player has on p_board since p_since,
-- reduced to their best one and ranked. Ties go to whoever got there first.
create or replace function public.leaderboard_best(
  p_board text,
  p_since timestamptz default null
)
returns table (
  rank          bigint,
  total         bigint,
  user_id       uuid,
  username      text,
  display_name  text,
  avatar_url    text,
  value         bigint,
  score         integer,
  time_seconds  integer,
  wave          integer,
  difficulty    text,
  details       jsonb,
  submitted_at  timestamptz,
  steam_synced  boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_mode       text;
  v_difficulty text;
  v_by_time    boolean := false;
begin
  case p_board
    when 'SURVIVAL_GLOBAL'   then v_mode := 'survival';
    when 'SURVIVAL_EASY'     then v_mode := 'survival'; v_difficulty := 'easy';
    when 'SURVIVAL_MEDIUM'   then v_mode := 'survival'; v_difficulty := 'medium';
    when 'SURVIVAL_HARD'     then v_mode := 'survival'; v_difficulty := 'hard';
    when 'SURVIVAL_HARDCORE' then v_mode := 'survival'; v_difficulty := 'hardcore';
    when 'SURVIVAL_LONGEST'  then v_mode := 'survival'; v_by_time := true;
    when 'COOP_SURVIVAL'     then v_mode := 'coop_survival';
    else raise exception 'invalid_board' using errcode = '22023';
  end case;

  return query
  with runs as (
    select s.*,
           (case when v_by_time then coalesce(s.time_seconds, 0) else s.score end)::bigint as v
      from public.player_scores s
      join public.profiles p on p.id = s.user_id
     where s.is_verified
       and s.mode = v_mode
       and (v_difficulty is null or s.difficulty = v_difficulty)
       and (p_since is null or s.submitted_at >= p_since)
       and coalesce(p.status, 'active') = 'active'
  ),
  best as (
    select distinct on (r.user_id) r.*
      from runs r
     order by r.user_id, r.v desc, r.submitted_at asc
  )
  select row_number() over (order by b.v desc, b.submitted_at asc),
         count(*) over (),
         b.user_id,
         p.username,
         p.display_name,
         p.avatar_url,
         b.v,
         b.score,
         b.time_seconds,
         b.level,
         b.difficulty,
         coalesce(b.metadata -> 'details', '[]'::jsonb),
         b.submitted_at,
         b.steam_synced_at is not null
    from best b
    join public.profiles p on p.id = b.user_id;
end;
$$;

create or replace function public.get_leaderboard(
  p_board  text,
  p_since  timestamptz default null,
  p_limit  integer default 50,
  p_offset integer default 0
)
returns table (
  rank          bigint,
  total         bigint,
  user_id       uuid,
  username      text,
  display_name  text,
  avatar_url    text,
  value         bigint,
  score         integer,
  time_seconds  integer,
  wave          integer,
  difficulty    text,
  details       jsonb,
  submitted_at  timestamptz,
  steam_synced  boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select * from public.leaderboard_best(p_board, p_since) lb
   order by lb.rank
   limit least(greatest(coalesce(p_limit, 50), 1), 100)
  offset greatest(coalesce(p_offset, 0), 0);
$$;

-- One player's standing on a board: no rows when they have no verified run.
create or replace function public.get_leaderboard_rank(
  p_board   text,
  p_user_id uuid,
  p_since   timestamptz default null
)
returns table (rank bigint, total bigint, value bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select lb.rank, lb.total, lb.value
    from public.leaderboard_best(p_board, p_since) lb
   where lb.user_id = p_user_id;
$$;

-- The website calls these with the service role. Keep them off the public
-- RPC surface so the only way in is through the API route's validation.
revoke all on function public.leaderboard_best(text, timestamptz) from public, anon, authenticated;
revoke all on function public.get_leaderboard(text, timestamptz, integer, integer) from public, anon, authenticated;
revoke all on function public.get_leaderboard_rank(text, uuid, timestamptz) from public, anon, authenticated;
grant execute on function public.leaderboard_best(text, timestamptz) to service_role;
grant execute on function public.get_leaderboard(text, timestamptz, integer, integer) to service_role;
grant execute on function public.get_leaderboard_rank(text, uuid, timestamptz) to service_role;
