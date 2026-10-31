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

Steam leaderboard names are the board names above. They are created on first
use (trusted writes only); their ids are cached in `public.steam_leaderboards`.
