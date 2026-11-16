# Audio library and Intergalactic Radio (AUDIO-01)

What `/audio` is, how to turn it on, and what has and has not been verified.

## What it does

- **Signed out**: the page shows the soundtrack's track titles and a sign-in
  prompt. No audio file can be reached.
- **Signed in**: the game's music grouped by the in-game radio's stations, every
  published sound effect ("Sound Lab"), favourites, the player's own stations,
  and their own uploaded music. A player bar plays any of it.
- **Admin** (`/admin/audio`): import the game repository's audio and a Google
  Drive folder's (see "Google Drive" below), publish or hide
  tracks, retitle them, and upload tracks the repository doesn't carry.
- **Game** (`GET /api/game/radio`): the player's favourites and stations, and the
  published soundtrack by built-in station, with download URLs. The contract is
  `docs/GAME_API.md` section 8. A game client for it exists on a branch of the
  game repository but is not in a released build, so nothing reaches the in-game
  radio today; the page says so. That client shows at most 3 of a player's
  stations (Favorites included), while the website lets them mark up to 12.

## Turning it on

1. **Apply the migration** `supabase/migrations/20261112_audio01_library_and_radio.sql`.
   It creates five tables (all row-level-security on, no policies, so only the
   server's service role can touch them), two private storage buckets
   (`game-audio`, 50 MB per file; `user-audio`, 20 MB per file; audio types only)
   and two functions. It is additive and safe to re-run. Until it is applied the
   signed-in page says the library is being set up.
2. **Set `GAME_REPO_TOKEN`** in the site's environment: a fine-grained GitHub
   token limited to the game repository with "Contents: Read-only". Redeploy.
3. **Sync**: open `/admin/audio` and press "Sync from the game repository". It
   uploads in batches and repeats until nothing is waiting. Run it again whenever
   audio changes in the game repository.

`.env.example` lists the optional limits.

## How the game repository maps to the library

Paths are relative to `assets/audio` (see `src/lib/audio/catalog.ts`).

| Path | Becomes |
|---|---|
| `music/<state>/<file>` | Music, on the station that plays `<state>` (`playing`, `game_start`, `world_map` → Deep Space FM; `combat` → Battle Wave; `station` → Dock Radio; `boss` → Epic Encounters). Any other state is listed under "Title Themes" on the website and is not sent to the radio |
| `sfx/<group>/<file>` | A sound effect in that group |
| `disabled/**` | Never imported |
| loose files at the top level | Imported **hidden**, except the title theme and the character-screen theme. Most are early placeholder takes, some byte-identical under two names. Publish any of them from `/admin/audio` |

A changed file is re-uploaded and keeps its title and visibility. A file deleted
from the repository is marked `removed` and its stored copy deleted; players'
stations and favourites stop listing it, and list it again, in place, if the
file returns at the same path.

**Known limitation: a track is identified by its path.** Renaming a file, or
moving it to another folder (say from `music/playing/` to `music/combat/`),
retires the old track and imports a new one, so it drops off every player's
stations and favourites. The sync does not yet recognise a moved file as the
same track.

At the time of writing the repository carries 68 audio files: 4 music tracks
(2 of them on a radio station) and 64 sound effects, 39 of which import as
published. Battle Wave, Dock Radio and Epic Encounters stay empty until tracks
land in `music/combat`, `music/station` and `music/boss`, or are uploaded on
`/admin/audio`.

## Google Drive (AUDIO-02)

A Google Drive folder is a second source of tracks, beside the game
repository. It is for music: finished tracks, and tracks the game doesn't play
yet. The sync **copies** each file into the same private storage the
repository's audio uses, so players never touch Drive, the sign-in gate is
unchanged, and nothing breaks if Drive is unreachable later.

### Turning it on

1. **Apply the migration** `supabase/migrations/20261116_audio02_drive_source.sql`
   (after the AUDIO-01 one). It adds two columns and widens one check.
2. **Make one folder in Drive** for the website's music and move or copy the
   tracks into it. Only this folder is read; nothing else in the Drive is
   visible to the site.
3. **Create a service account**: in Google Cloud Console pick or create a
   project, enable the "Google Drive API", then IAM & Admin → Service Accounts
   → Create. Open it → Keys → Add key → JSON. No roles are needed.
4. **Share the folder** with the service account's email
   (`...@...iam.gserviceaccount.com`) as **Viewer**.
5. **Set two environment variables** on the site and redeploy:
   `GOOGLE_DRIVE_AUDIO_FOLDER` (the folder's URL or id) and
   `GOOGLE_DRIVE_SERVICE_ACCOUNT` (the whole JSON key, or its base64).
6. Open `/admin/audio` and press **Sync from Google Drive**. After that an
   hourly job (`vercel.json`) picks up changes on its own; it needs
   `CRON_SECRET` set, like the site's other scheduled jobs.

`GOOGLE_DRIVE_API_KEY` works in place of the service account, but only on a
folder shared "Anyone with the link", which makes the files public. Prefer the
service account.

### How the folder maps to the library

| In the folder | Becomes |
|---|---|
| a file at the top level | Music under **Soundtrack Sessions** (website only; not sent to the in-game radio) |
| `Deep Space FM/`, `Battle Wave/`, `Dock Radio/`, `Epic Encounters/` (or `exploration`, `combat`, `station`, `boss`) | Music on that station, on the website and the in-game radio |
| `Title Themes/` | Music under Title Themes |
| `Sound Effects/<group>/` (or `sfx/<group>/`) | A sound effect in that group |
| `music/<state>/`, `sfx/<group>/` | As in the game repository |
| `Drafts/`, `WIP/`, `Private/`, `Hidden/`, `Disabled/`, `Archive/` | Never imported |
| any other folder | Music under Soundtrack Sessions |

Folder names ignore case and punctuation. Files that are not OGG, MP3, WAV or
FLAC (AIFF, images, Google Docs) are ignored.

- **A track is the Drive file, not its name.** Rename it and the track takes
  the new title; move it to another folder and it changes station. Favourites
  and players' stations keep it either way. (A title or category edited on
  `/admin/audio` stays until the file is next renamed or moved.)
- Replace a file's contents ("Manage versions" in Drive) and the next sync
  copies the new audio; title and visibility stay.
- Trash a file, or move it out of the folder or into `Drafts/`, and the track
  is retired; put it back and it returns.
- **50 MB per file.** A WAV master is about 10 MB a minute, so longer tracks
  must be exported as MP3 or OGG. The sync lists what it skipped and why.
- If the same audio is in both the game repository and the Drive folder it is
  listed twice; keep each track in one place.

## Players' uploads

- MP3, OGG, WAV or FLAC: the formats the game's music stream plays.
- The file goes from the browser straight to private storage through a one-time
  URL, then the server checks the stored object: its real size against the
  per-file limit and the account's quota, and its first bytes against the format
  its name claims. A file that fails is deleted.
- An upload is only ever served to its owner, on the website and to their game.
- Deleting an account's profile row cascades its rows, but **not** the stored
  files; those would need removing from the `user-audio` bucket by hand.

## What was verified, and how

Checked directly, outside the site:

- The migration applies cleanly, twice, to a local Postgres 16, and its two
  functions behave as intended when called in SQL (ownership, ordering,
  de-duplication, the per-station cap, moving one account's audio rows to
  another).
- The duration and format reader agrees with `ffprobe` to within 7 ms on all of
  the game's audio files plus generated MP3 (CBR, VBR), FLAC and Opus files.

Checked through a production build of the site (`next build` + `next start`)
with that migration applied:

- The repository sync: a first import of all 68 files, a re-run that changes
  nothing, and 20 checks on a file leaving the repository and coming back.
- 85 API checks: sign-in gating on every route, CSRF, per-user isolation of
  uploads, stations and favourites, upload validation, the game endpoint's
  contents, admin-only access, hide/publish, and cleanup.
- 34 browser checks on `/audio` (desktop and phone): the sign-in gate, real
  playback, favourites, building, reordering and renaming a station, uploading,
  the Sound Lab, persistence across a reload, and deletion.
- 14 browser checks on `/admin/audio`.

## What was not verified

- **Real Supabase and real GitHub.** The checks above used local stand-ins for
  Supabase's REST, auth and storage endpoints and for the GitHub API (the latter
  served from a local clone of the game repository). Request shapes were taken
  from the `supabase-js` source, but the first run against the real project is
  the real test, in particular the browser's direct upload to storage and the
  error code Supabase returns when a table is missing.
- **The content-security policy.** `media-src` in `next.config.js` now allows
  `https://*.supabase.co` so the browser may play signed storage URLs. The
  browser checks ran with the policy bypassed (the stand-in is on localhost), so
  this has not been exercised.
- **MP3 playback in a browser.** The test browser has no MP3 decoder. MP3
  upload, validation and byte-exact download were checked through the API.
- **The Steam account merge.** `POST /api/steam/merge` now also moves the merged
  account's audio rows across, and keeps the merged account instead of deleting
  it if that move fails. The SQL function was tested; the route change itself
  was type-checked and built but never run. Apply the migration before deploying
  so the function exists when a merge happens.
- If the migration is missing, the page, the game endpoint and the admin page
  say so, but the stream and write routes answer with a plain 500.

## AUDIO-02 (Google Drive): what was and was not verified

- Verified with a stand-in for the Drive API and the database (50 checks): the
  service-account token request (signature checked against the key), listing
  with subfolders and paging, classification of every folder rule above, a
  first import, an unchanged re-run, changed bytes, rename, move, retire and
  return, trash, batching, and Drive's error answers. The site type-checks and
  builds.
- **Not verified: the real Google Drive API and the real Supabase project.**
  No service account existed when this was written. The first sync from
  `/admin/audio` is the real test.
- The migration was not run against a database.

## Also changed outside the audio code

- `src/lib/supabaseServer.ts`: the server's Supabase client now marks every
  request `no-store`. Without it, Next 14 cached database reads indefinitely in
  any route that only exports `GET` and sets `dynamic = 'force-dynamic'`; the
  library kept returning the rows from its first request. This applies to every
  route that uses the client, not only the audio ones.
