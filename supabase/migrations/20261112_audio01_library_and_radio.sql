-- AUDIO-01: the audio library, player stations and uploads behind /audio,
-- and what the in-game Intergalactic Radio reads through /api/game/radio.
--
--   audio_tracks          the game's own audio: every file under the game
--                         repo's assets/audio (synced by /api/admin/audio/sync)
--                         plus tracks an admin uploads on the website.
--   audio_uploads         a player's own music, private to their account.
--   audio_favorites       tracks or uploads a player starred.
--   audio_playlists       a player's stations ("soundtracks").
--   audio_playlist_items  the ordered tracks of a station.
--
-- Two private storage buckets hold the files. Nothing here is readable with
-- the publishable key: row-level security is on with no policies, and the
-- buckets have no storage policies, so every read and write goes through the
-- website's server routes (service role), which hand out short-lived signed
-- URLs to the signed-in owner.

-- ── storage ────────────────────────────────────────────────────────────

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('game-audio', 'game-audio', false, 52428800,
   array['audio/ogg', 'audio/wav', 'audio/mpeg', 'audio/flac']),
  ('user-audio', 'user-audio', false, 20971520,
   array['audio/ogg', 'audio/wav', 'audio/mpeg', 'audio/flac'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ── the game's audio ───────────────────────────────────────────────────

create table if not exists public.audio_tracks (
  id               uuid primary key default gen_random_uuid(),
  -- 'repo': a file under assets/audio in the game repository.
  -- 'website': uploaded by an admin on /admin/audio.
  source           text not null default 'repo' check (source in ('repo', 'website')),
  -- Path under assets/audio, e.g. 'music/world_map/world_map_loop.ogg'.
  repo_path        text unique,
  git_sha          text,
  storage_path     text not null unique,
  kind             text not null check (kind in ('music', 'sfx')),
  -- music: the game's music state folder (playing, combat, station, boss,
  -- game_start, world_map, main_menu, ...). sfx: the sfx folder (player,
  -- cyl, enemy, ui, ...).
  category         text not null check (category ~ '^[a-z0-9_]{1,40}$'),
  title            text not null check (char_length(title) between 1 and 120),
  description      text check (description is null or char_length(description) <= 500),
  mime_type        text not null,
  bytes            bigint not null check (bytes > 0),
  duration_seconds numeric(9, 3) check (duration_seconds is null or duration_seconds >= 0),
  -- published: listed. hidden: an admin took it off the page. removed: the
  -- file left the repository; kept so stations that hold it can say so.
  status           text not null default 'published'
                     check (status in ('published', 'hidden', 'removed')),
  sort_order       integer not null default 0,
  created_at       timestamptz not null default timezone('utc', now()),
  updated_at       timestamptz not null default timezone('utc', now()),
  constraint audio_tracks_repo_has_path check (source <> 'repo' or repo_path is not null)
);

create index if not exists idx_audio_tracks_listing
  on public.audio_tracks (kind, category, sort_order, title) where status = 'published';

comment on table public.audio_tracks is
  'AUDIO-01: the game''s audio catalogue (repo sync + admin uploads). Files live in the private game-audio bucket. Service role only.';

-- ── a player's own music ───────────────────────────────────────────────

create table if not exists public.audio_uploads (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.profiles(id) on delete cascade,
  title             text not null check (char_length(title) between 1 and 120),
  artist            text check (artist is null or char_length(artist) <= 120),
  original_filename text check (original_filename is null or char_length(original_filename) <= 255),
  storage_path      text not null unique,
  mime_type         text not null,
  -- Declared at request time; replaced by the stored object's size once the
  -- upload is confirmed.
  bytes             bigint not null check (bytes > 0),
  duration_seconds  numeric(9, 3) check (duration_seconds is null or duration_seconds >= 0),
  -- pending: a signed upload URL was issued. ready: the file arrived and
  -- its header is a supported audio format.
  status            text not null default 'pending' check (status in ('pending', 'ready')),
  created_at        timestamptz not null default timezone('utc', now()),
  updated_at        timestamptz not null default timezone('utc', now())
);

create index if not exists idx_audio_uploads_user on public.audio_uploads (user_id, created_at desc);

comment on table public.audio_uploads is
  'AUDIO-01: music a player uploaded for their own stations. Private to the owner; files live in the private user-audio bucket. Service role only.';

-- ── favourites ─────────────────────────────────────────────────────────

create table if not exists public.audio_favorites (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  track_id   uuid references public.audio_tracks(id) on delete cascade,
  upload_id  uuid references public.audio_uploads(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  constraint audio_favorites_one_target check (num_nonnulls(track_id, upload_id) = 1)
);

create unique index if not exists uq_audio_favorites_track
  on public.audio_favorites (user_id, track_id) where track_id is not null;
create unique index if not exists uq_audio_favorites_upload
  on public.audio_favorites (user_id, upload_id) where upload_id is not null;
create index if not exists idx_audio_favorites_track on public.audio_favorites (track_id);
create index if not exists idx_audio_favorites_upload on public.audio_favorites (upload_id);

comment on table public.audio_favorites is
  'AUDIO-01: a player''s starred tracks and uploads. Service role only.';

-- ── stations ───────────────────────────────────────────────────────────

create table if not exists public.audio_playlists (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  name         text not null check (char_length(name) between 1 and 40),
  description  text check (description is null or char_length(description) <= 200),
  -- The station's colour on the radio dial, '#rrggbb'.
  color        text not null default '#22d3ee' check (color ~ '^#[0-9a-f]{6}$'),
  -- Whether the in-game Intergalactic Radio lists this station.
  sync_to_game boolean not null default true,
  created_at   timestamptz not null default timezone('utc', now()),
  updated_at   timestamptz not null default timezone('utc', now())
);

create index if not exists idx_audio_playlists_user on public.audio_playlists (user_id, created_at);

comment on table public.audio_playlists is
  'AUDIO-01: a player''s stations. sync_to_game decides whether /api/game/radio lists it. Service role only.';

create table if not exists public.audio_playlist_items (
  id          uuid primary key default gen_random_uuid(),
  playlist_id uuid not null references public.audio_playlists(id) on delete cascade,
  position    integer not null check (position >= 0),
  track_id    uuid references public.audio_tracks(id) on delete cascade,
  upload_id   uuid references public.audio_uploads(id) on delete cascade,
  created_at  timestamptz not null default timezone('utc', now()),
  constraint audio_playlist_items_one_target check (num_nonnulls(track_id, upload_id) = 1),
  constraint audio_playlist_items_position unique (playlist_id, position)
);

create index if not exists idx_audio_playlist_items_track on public.audio_playlist_items (track_id);
create index if not exists idx_audio_playlist_items_upload on public.audio_playlist_items (upload_id);

comment on table public.audio_playlist_items is
  'AUDIO-01: the ordered tracks of a station; each row is a game track or one of the owner''s uploads. Service role only.';

-- ── updated_at ─────────────────────────────────────────────────────────

drop trigger if exists trg_audio_tracks_updated_at on public.audio_tracks;
create trigger trg_audio_tracks_updated_at before update on public.audio_tracks
  for each row execute function public.update_updated_at_column();

drop trigger if exists trg_audio_uploads_updated_at on public.audio_uploads;
create trigger trg_audio_uploads_updated_at before update on public.audio_uploads
  for each row execute function public.update_updated_at_column();

drop trigger if exists trg_audio_playlists_updated_at on public.audio_playlists;
create trigger trg_audio_playlists_updated_at before update on public.audio_playlists
  for each row execute function public.update_updated_at_column();

-- ── access: server routes only ─────────────────────────────────────────

alter table public.audio_tracks         enable row level security;
alter table public.audio_uploads        enable row level security;
alter table public.audio_favorites      enable row level security;
alter table public.audio_playlists      enable row level security;
alter table public.audio_playlist_items enable row level security;

revoke all on public.audio_tracks, public.audio_uploads, public.audio_favorites,
              public.audio_playlists, public.audio_playlist_items
  from anon, authenticated;

-- ── replace a station's tracks in one transaction ──────────────────────
--
-- p_items is a JSON array, in play order, of {"track_id": uuid} or
-- {"upload_id": uuid}. Anything the caller may not put on a station is
-- skipped rather than failing the save: a track that is no longer
-- published, an upload that is not theirs or not ready, a repeat, sound
-- effects. Returns how many rows were kept.

create or replace function public.audio_replace_playlist_items(
  p_playlist uuid,
  p_user     uuid,
  p_items    jsonb,
  p_max      integer default 200
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_kept integer := 0;
begin
  perform 1 from public.audio_playlists
   where id = p_playlist and user_id = p_user
     for update;
  if not found then
    raise exception 'playlist_not_found' using errcode = 'P0002';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' then
    raise exception 'items_not_array' using errcode = '22023';
  end if;

  delete from public.audio_playlist_items where playlist_id = p_playlist;

  with raw as (
    select ord,
           case when (item ->> 'track_id')  ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
                then (item ->> 'track_id')::uuid end  as track_id,
           case when (item ->> 'upload_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
                then (item ->> 'upload_id')::uuid end as upload_id
      from jsonb_array_elements(p_items) with ordinality as e(item, ord)
     where jsonb_typeof(item) = 'object'
  ),
  allowed as (
    select r.ord, t.id as track_id, null::uuid as upload_id
      from raw r
      join public.audio_tracks t
        on t.id = r.track_id and t.status = 'published' and t.kind = 'music'
     where r.upload_id is null
    union all
    select r.ord, null::uuid, u.id
      from raw r
      join public.audio_uploads u
        on u.id = r.upload_id and u.user_id = p_user and u.status = 'ready'
     where r.track_id is null
  ),
  first_seen as (
    select distinct on (track_id, upload_id) ord, track_id, upload_id
      from allowed
     order by track_id, upload_id, ord
  ),
  numbered as (
    select row_number() over (order by ord) - 1 as position, track_id, upload_id
      from first_seen
  )
  insert into public.audio_playlist_items (playlist_id, position, track_id, upload_id)
  select p_playlist, position, track_id, upload_id
    from numbered
   where position < greatest(p_max, 0);
  get diagnostics v_kept = row_count;

  update public.audio_playlists set updated_at = timezone('utc', now()) where id = p_playlist;
  return v_kept;
end;
$$;

revoke all on function public.audio_replace_playlist_items(uuid, uuid, jsonb, integer) from public, anon, authenticated;
grant execute on function public.audio_replace_playlist_items(uuid, uuid, jsonb, integer) to service_role;

comment on function public.audio_replace_playlist_items(uuid, uuid, jsonb, integer) is
  'AUDIO-01: replace a station''s ordered tracks atomically, keeping only what its owner may list. Called by PUT /api/audio/playlists/[id].';

-- ── account merge: stations follow the player ──────────────────────────
--
-- merge_steam_account folds a Steam-only account into an email account and
-- the API route then deletes the Steam account's auth user, which would
-- cascade its audio rows away. /api/steam/merge calls this first.

create or replace function public.audio_move_user_data(p_source uuid, p_target uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uploads   integer := 0;
  v_playlists integer := 0;
  v_favorites integer := 0;
begin
  if p_source is null or p_target is null or p_source = p_target then
    raise exception 'merge_same_account' using errcode = '22023';
  end if;

  update public.audio_uploads set user_id = p_target where user_id = p_source;
  get diagnostics v_uploads = row_count;

  update public.audio_playlists set user_id = p_target where user_id = p_source;
  get diagnostics v_playlists = row_count;

  -- One star per player per track: drop the source's where the target
  -- already has it.
  delete from public.audio_favorites f
   where f.user_id = p_source
     and exists (select 1 from public.audio_favorites t
                  where t.user_id = p_target
                    and t.track_id  is not distinct from f.track_id
                    and t.upload_id is not distinct from f.upload_id);
  update public.audio_favorites set user_id = p_target where user_id = p_source;
  get diagnostics v_favorites = row_count;

  return jsonb_build_object('uploads', v_uploads, 'playlists', v_playlists, 'favorites', v_favorites);
end;
$$;

revoke all on function public.audio_move_user_data(uuid, uuid) from public, anon, authenticated;
grant execute on function public.audio_move_user_data(uuid, uuid) to service_role;

comment on function public.audio_move_user_data(uuid, uuid) is
  'AUDIO-01: move a player''s uploads, stations and favourites to another account. Called by POST /api/steam/merge before the merged account is deleted.';
