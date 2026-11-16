-- AUDIO-02: a Google Drive folder as a second source for the audio library.
--
-- Apply after 20261112_audio01_library_and_radio.sql. Additive and safe to
-- re-run.
--
-- A track synced from Drive (source = 'drive') is identified by its Drive
-- file id, so renaming it or moving it between folders keeps the same track
-- (and every player's favourites and stations that hold it). `git_sha` holds
-- the file's md5 from Drive: like a blob sha, it changes exactly when the
-- bytes do. `repo_path` stays null, which also tells the game it has no
-- local copy of the track.

alter table public.audio_tracks
  add column if not exists drive_file_id text,
  add column if not exists drive_path text;

create unique index if not exists uq_audio_tracks_drive_file
  on public.audio_tracks (drive_file_id) where drive_file_id is not null;

alter table public.audio_tracks drop constraint if exists audio_tracks_source_check;
alter table public.audio_tracks
  add constraint audio_tracks_source_check check (source in ('repo', 'website', 'drive'));

alter table public.audio_tracks drop constraint if exists audio_tracks_drive_has_file;
alter table public.audio_tracks
  add constraint audio_tracks_drive_has_file check (source <> 'drive' or drive_file_id is not null);

comment on column public.audio_tracks.drive_file_id is
  'AUDIO-02: the Google Drive file this track is synced from (source = ''drive'').';
comment on column public.audio_tracks.drive_path is
  'AUDIO-02: the file''s path inside the Drive folder at the last sync. Its folder decides the station.';
