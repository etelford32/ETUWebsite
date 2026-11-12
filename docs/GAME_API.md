# Game ↔ Website API (Steam build)

How the game client talks to the website. The website is the source of
truth for accounts, callsigns, runs and lifetime stats; Steam leaderboards
are a mirror the website maintains (LEADERBOARD-00). Base URL:
`https://www.exploretheuniverse2175.com`.

All bodies are JSON. Every response carries `ok: true|false`; failures carry
`error` (a stable code) and sometimes `message` (human text, not stable).

## 1. Identity

### 1.1 Sign in — `POST /api/game/steam-session`

Once per launch. The game gets a ticket from Steamworks and trades it for a
Supabase session.

```
ticket = SteamUser()->GetAuthTicketForWebApi("etu-account")   // identity string must be exactly this
POST /api/game/steam-session
{ "ticket": "<hex>" }
```

```json
{
  "ok": true,
  "created": false,
  "user_id": "…uuid…",
  "steam_id": "7656119…",
  "session": { "access_token": "…", "refresh_token": "…", "expires_at": 1761580000, "expires_in": 3600 },
  "profile": { "username": "Nova", "display_name": "Nova", "avatar_url": "…", "needs_username": false },
  "entitlement": { "owns_app": true, "permanent": true, "family_shared": false }
}
```

Errors: `invalid_ticket` (401), `banned` (403), `account_suspended` / `account_deleted` (403),
`steam_unavailable` (502), `not_configured` (503), `rate_limited` (429, 10/min per IP).

Keep `access_token` in memory and `refresh_token` on disk (OS keychain if
available). The access token lasts an hour; refresh it with the Supabase
auth endpoint, or simply call `steam-session` again with a fresh ticket.
One Supabase user exists per Steam ID, so signing in from the game and
signing in with Steam on the website land on the same account.

### 1.2 Callsign and tier — Supabase RPCs with the session

`needs_username: true` means the player hasn't chosen a callsign yet. Use the
Supabase REST RPC endpoint with the access token as the bearer:

```
POST {SUPABASE_URL}/rest/v1/rpc/claim_username   { "p_username": "Nova" }
  → { "ok": true, "username": "Nova" }
  → { "ok": false, "error": "invalid" | "reserved" | "taken" | "rate_limited" }
POST {SUPABASE_URL}/rest/v1/rpc/get_my_profile   {}
  → { id, username, display_name, avatar_url, steam_id, faction_choice, is_public,
      needs_username, status, tier, is_verified_owner, steam_purchase_verified_at }
```

Rules: 3–20 characters, letters/digits/`_`/`-`; first claim and first rename
free, then one rename per 30 days. `tier` is `player | alpha | dev` (TIER-01)
and decides which Steam branch the account receives; it never unlocks
anything inside a build.

## 2. Runs — `POST /api/game/submit-run`

Call once per finished run, with a fresh `run_id` (UUID v4) generated when the
run starts. Retries with the same `run_id` are idempotent (`duplicate: true`).

```
POST /api/game/submit-run
Authorization: Bearer <access_token>
{
  "run_id": "6f1c…-…",                 // UUID, one per run
  "mode": "survival",                 // survival | coop_survival
  "difficulty": "hard",               // easy | medium | hard | hardcore
  "score": 123456,                    // integer 0 … 2147483647
  "time_seconds": 845,                // integer, 0 … 86400
  "wave": 12,                         // integer ≥ 1
  "kills": 310,                       // integer ≥ 0
  "ended_at": "2026-10-27T18:02:11Z", // ISO 8601, when the run ended
  "ship_skin": "interceptor",         // optional, ≤ 40 chars
  "ship_skin_index": 3,               // optional
  "doctrine": "vanguard",             // optional, ≤ 40 chars
  "doctrine_index": 1,                // optional
  "game_version": "0.4.1",            // optional, ≤ 32 chars
  "build": 4120,                      // optional, integer
  "end_reason": "destroyed",          // optional, ≤ 40 chars
  "coop_session_id": "…",             // optional, co-op only
  "ticket": "<hex>"                   // optional but recommended, see below
}
```

```json
{
  "ok": true,
  "run_id": "6f1c…",
  "duplicate": false,
  "verified": true,
  "reason": null,
  "personal_best": true,
  "steam_verified": true,
  "rank": { "board": "SURVIVAL_GLOBAL", "rank": 37, "total": 1203 },
  "difficulty_rank": { "board": "SURVIVAL_HARD", "rank": 9, "total": 240 },
  "steam": { "synced": true, "error": null }
}
```

**Verification.** A run goes on the public boards (`verified: true`) when it
passes the plausibility checks: at least 30 s and at most 6 h long, ended
within the last 14 days and not in the future, and score within the ceiling
for its length and difficulty. A failing run is still stored, unverified,
with `reason` saying why; it never reaches Steam.

**Steam ticket (recommended).** Send a fresh `GetAuthTicketForWebApi("etu-account")`
ticket in `ticket`. The website confirms with Steam that a live Steam client
for the linked Steam ID is behind the request and records
`steam_verified: true` on the run. A ticket for a *different* Steam ID than
the one linked to the account is refused (`403 account_mismatch`). Without
a ticket the run is accepted on the bearer token alone (`steam_verified: false`).

**Boards a run feeds.** Survival: `SURVIVAL_GLOBAL`, `SURVIVAL_<DIFFICULTY>` and
`SURVIVAL_LONGEST` (ranked by `time_seconds`). Co-op: `COOP_SURVIVAL`. Steam
keeps each player's **best** (`KeepBest`). `steam.synced: false` with an
`error` means the Steam write will be retried by the website every 10
minutes; nothing for the client to do.

**Steam entry details** (`DownloadLeaderboardEntries` `details`, int32[]), version 1,
append-only: `[version, time_seconds, wave, difficulty_index, ship_skin_index, kills, doctrine_index, build]`
where `difficulty_index` is the index into `easy, medium, hard, hardcore`.

Steam's boards are *trusted writes only*: `UploadLeaderboardScore` from the
client is rejected by Steam, and that is intended. Read them with
`DownloadLeaderboardEntries` as usual.

Errors: `not_authenticated` (401), `invalid_ticket` (401, only when no bearer was sent),
`needs_username` / `no_steam_id` / `account_suspended` / `account_mismatch` / `banned` (403),
`bad_request` (400), `rate_limited` (429, 30 runs per hour per account), `steam_unavailable` (502).

Offline: queue the run body on disk and replay it later with the same
`run_id` and a fresh ticket. Tickets are short-lived, so never store them.
Runs older than 14 days will be stored but not verified.

## 3. Lifetime stats — `POST /api/game/stats`, `GET /api/game/stats`

Sync cumulative totals whenever convenient (end of run, on quit). Counters
only move up: a lower value than the website holds is ignored, so a
reinstall or stale save can't erase progress.

```
POST /api/game/stats
Authorization: Bearer <access_token>
{
  "ticket": "<hex>",                       // optional; sets steam_verified in the response
  "stats": {
    "level": 14, "xp": 90210,
    "total_kills": 1200, "total_deaths": 38, "total_wins": 61, "total_losses": 12,
    "total_playtime": 73600,               // seconds
    "highest_score": 123456,
    "ship_class": "interceptor"            // ≤ 40 chars, or null
  }
}
→ { "ok": true, "updated": ["level","xp","total_kills"], "ignored": { "total_deaths": "kept 40 (lifetime totals only move up)" },
    "steam_verified": true, "stats": { …current values… } }
```

`GET /api/game/stats` with the bearer returns `{ ok, stats }`. Limit: 120 writes per hour per account.

## 4. Reading leaderboards

- `GET /api/leaderboard?board=SURVIVAL_HARD&window=all&page=1&pageSize=50` — one row per
  player (their best verified run), ranked exactly like the Steam board of the same name.
  `window` is `today | 7d | 30d | 90d | all`. Rows carry `rank`, `value` (score, or seconds for
  `SURVIVAL_LONGEST`), `score`, `time_seconds`, `level` (wave), `difficulty`, `details`,
  `steam_synced` and a public `profile` (id, username, display_name, avatar_url). Public, no auth.
- `https://www.exploretheuniverse2175.com/leaderboard?board=SURVIVAL_HARD` — the "view on the
  website" deep link for the in-game leaderboard screen.

## 5. Feedback — `POST /api/feedback`

See `GAME_FEEDBACK_INTEGRATION.md`; send `"source": "game"` and the bearer if signed in.

## 6. Error handling checklist for the client

| Situation | What to do |
|---|---|
| `401 not_authenticated` on any game route | Access token expired: call `steam-session` again, retry once |
| `403 needs_username` | Open the callsign screen (`claim_username`), then resubmit |
| `403 account_mismatch` | The Steam account running the game isn't the one linked to this ETU account; show "sign in with the Steam account linked to your profile" |
| `403 account_suspended` | Show the website's support link; don't retry |
| `429 rate_limited` | Back off `retry_after` seconds |
| `502 steam_unavailable` / `503 not_configured` on `steam-session` | Play offline; retry sign-in later |
| `verified: false` on a run | Tell the player the run was recorded but didn't qualify for the boards (`reason`) |
| `steam.synced: false` | Nothing; the website retries |

## 7. Server configuration (website side)

| Variable | Needed for |
|---|---|
| `STEAM_PUBLISHER_KEY` | ticket validation, ownership checks, Steam leaderboards (partner.steam-api.com) |
| `STEAM_APP_ID` | defaults to `4094340` |
| `CRON_SECRET` | the 10-minute Steam retry cron (`/api/cron/steam-leaderboard-sync`) |
| `LEADERBOARD_MAX_POINTS_PER_SECOND`, `LEADERBOARD_SCORE_ALLOWANCE` | plausibility ceiling tuning (defaults 200 and 5000) |
| `STEAM_WEB_API_KEY` | persona/avatar lookups only |
| `GAME_REPO_TOKEN` | the audio library's sync from the game repository (section 8); a GitHub token with read access to its contents |
| `GAME_REPO`, `GAME_REPO_BRANCH`, `GAME_REPO_AUDIO_PATH` | default `etelford32/ETU`, `main`, `assets/audio` |

Steam leaderboard names are the board names above. They are created on first
use (trusted writes only); their ids are cached in `public.steam_leaderboards`.

## 8. Intergalactic Radio — `GET /api/game/radio`

**Status: implemented on the website (AUDIO-01) but not yet deployed.** A game
client written to this section exists on the game repository's branch
`claude/gracious-darwin-s5181v` (commit `0743ec49`, RADIONET-01,
`src/etu/audio/radio_feed.py`); it has not been run against this endpoint on a
real deployment. This section is the contract that client codes against.

As of that commit the game lists at most the first 3 entries of `stations`
(`MAX_PILOT_STATIONS`), and `Favorites` counts as one of them; it accepts files
up to 64 MB, and only downloads from HTTPS URLs on the site's or the Supabase
project's origin.

On the website (`/audio`) a signed-in player stars tracks, builds stations from
the game's soundtrack and their own uploaded music, and chooses which stations
go to the game. This endpoint is how the in-game radio reads the result.

```
GET /api/game/radio
Authorization: Bearer <access_token>      // from /api/game/steam-session
```

```json
{
  "ok": true,
  "generated_at": "2026-11-12T17:45:10.000Z",
  "urls_expire_in": 7200,
  "tracks": {
    "652f2647-…": {
      "id": "652f2647-…",
      "source": "game",
      "title": "Northern Winds",
      "artist": null,
      "category": "game_start",
      "state": "GAME_START",
      "repo_path": "music/game_start/northern_winds_atmosphere.ogg",
      "version": "d94d17edb56f7c962f049f022f143a257531cd02",
      "ext": "ogg",
      "mime_type": "audio/ogg",
      "bytes": 552547,
      "duration_seconds": 34.375,
      "url": "https://…supabase.co/storage/v1/object/sign/game-audio/…?token=…"
    },
    "9b1d…": {
      "id": "9b1d…", "source": "upload", "title": "Midnight Drive", "artist": "Me",
      "category": null, "state": null, "repo_path": null, "version": "9b1d…",
      "ext": "mp3", "mime_type": "audio/mpeg", "bytes": 4812345, "duration_seconds": 201.4,
      "url": "https://…supabase.co/storage/v1/object/sign/user-audio/…?token=…"
    }
  },
  "stations": [
    { "id": "favorites", "kind": "favorites", "name": "Favorites", "tab": "FAVORITES",
      "description": "Tracks you starred on the website", "color": [251, 191, 36],
      "track_ids": ["652f2647-…", "9b1d…"] },
    { "id": "playlist:3f0c…", "kind": "playlist", "name": "Night Run FM", "tab": "NIGHT RUN FM",
      "description": "Your station", "color": [244, 114, 182],
      "track_ids": ["9b1d…", "652f2647-…"] }
  ],
  "catalog": [
    { "station_id": "EXPLORATION", "name": "Deep Space FM",
      "states": ["PLAYING", "GAME_START", "WORLD_MAP"], "track_ids": ["652f2647-…"] },
    { "station_id": "COMBAT", "name": "Battle Wave", "states": ["COMBAT"], "track_ids": [] },
    { "station_id": "STATION", "name": "Dock Radio", "states": ["STATION"], "track_ids": [] },
    { "station_id": "BOSS", "name": "Epic Encounters", "states": ["BOSS"], "track_ids": [] }
  ]
}
```

**`tracks`** holds every track named anywhere below, once, keyed by id. Every id
in a `track_ids` list is guaranteed to be a key of `tracks`.

- `source: "game"` is a track from the game's own soundtrack. `repo_path` is its
  path under `assets/audio` when the game repository carries it, and `null` for a
  track published only on the website. `version` is the file's git blob sha (or a
  timestamp for website-only tracks) and changes exactly when the bytes change.
- `source: "upload"` is the player's own music. It is only ever returned to its
  owner. Its bytes never change (a new file is a new id), so `version` is the id.
- `ext` is one of `ogg`, `mp3`, `wav`, `flac`: the formats `pygame.mixer.music`
  plays (`etu.audio.soundtrack.AUDIO_EXTENSIONS`).

**`stations`** are the player's own, in dial order: `Favorites` first (present only
when they have starred something playable), then each station they built and left
set to "on my in-game radio". Empty stations are omitted. `color` is `[r, g, b]`.

**`catalog`** lists the published soundtrack by built-in station id (the ids in
`etu.audio.radio_stations.STATIONS`), so a station the build ships empty can fill
from the website. A built-in station with nothing published is listed with an
empty `track_ids`.

Only music reaches the radio: sound effects and menu-only themes (AUDIOREPO-02)
are never listed.

**What the client should do**

| Step | Detail |
|---|---|
| Prefer the local file | For a `game` track with a `repo_path` the build already has under `assets/audio`, play that file and download nothing |
| Cache downloads | Store other tracks on disk keyed by `id` + `version`; a cached file with the same key never needs fetching again |
| Download off the frame loop | `url` is a plain HTTPS GET with no headers; do it on a worker thread, as `AccountHttpClient` does its calls |
| Never store a `url` | URLs stop working `urls_expire_in` seconds after `generated_at`; call this endpoint again for fresh ones |
| Check what arrived | Confirm the byte count matches `bytes` before handing the file to the mixer |
| Offline | Keep the last response's stations and play whatever is already cached |

Errors: `not_authenticated` (401; token missing or expired, sign in again and retry once),
`account_suspended` / `account_deleted` (403), `rate_limited` (429, 60 calls per hour per
account, with `retry_after`), `not_configured` (503; the audio library isn't set up on
this deployment yet, so play the built-in stations only).

The game signs in through Steam, so a player's stations reach the game only when
the website account they built them on has that Steam ID: either they signed in
to the website with Steam, or they linked Steam on their profile.

Website setup for this feature (database migration, repository sync, limits) is
in `docs/AUDIO_LIBRARY.md`.
