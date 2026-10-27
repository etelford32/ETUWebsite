# Game ↔ Website API (Steam build)

How the game client talks to the website. The website is the source of
truth for accounts, callsigns, scores and lifetime stats; Steam leaderboards
are a mirror the website maintains. Base URL: `https://www.exploretheuniverse2175.com`.

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

### 1.2 Callsign — Supabase RPCs with the session

`needs_username: true` means the player hasn't chosen a callsign yet. Use the
Supabase REST RPC endpoint with the access token as the bearer:

```
POST {SUPABASE_URL}/rest/v1/rpc/claim_username   { "p_username": "Nova" }
  → { "ok": true, "username": "Nova" }
  → { "ok": false, "error": "invalid" | "reserved" | "taken" | "rate_limited" }
POST {SUPABASE_URL}/rest/v1/rpc/get_my_profile   {}
  → { id, username, display_name, avatar_url, steam_id, faction_choice, is_public,
      needs_username, status, is_verified_owner, steam_purchase_verified_at }
```

Rules: 3–20 characters, letters/digits/`_`/`-`; first claim and first rename
free, then one rename per 30 days.

## 2. Scores — `POST /api/game/submit-score`

Call at the end of a run. Send **both** the bearer token and a fresh ticket:
the token identifies the account, the ticket proves a live Steam client is
behind the request. A submission with a valid ticket for the linked Steam ID
is *verified*: it shows on the public board immediately and is mirrored to
Steam. Without a ticket (or if Steam is down) the run is still recorded,
just unverified, with the reason in the response.

```
POST /api/game/submit-score
Authorization: Bearer <access_token>
{
  "ticket": "<hex from GetAuthTicketForWebApi('etu-account')>",
  "score": 123456,              // integer 0 … 2147483647
  "mode": "speedrun",           // speedrun | survival | discovery | boss_rush | global
  "platform": "PC",             // PC | Mac | Linux | PS | Xbox | Switch   (Steam Deck → "Linux")
  "level": 12,                  // optional, integer ≥ 1
  "time_seconds": 845,          // optional, integer ≥ 0
  "metadata": { "build": "0.4.1", "seed": "A7F3", "difficulty": "hard" }   // optional, ≤ 4 KB
}
```

```json
{
  "ok": true,
  "score_id": "…uuid…",
  "submitted_at": "2026-10-27T18:02:11Z",
  "is_verified": true,
  "verify_reason": null,
  "rank_all_time": 37,
  "steam": { "mirrored": true, "leaderboard_id": 1234567, "leaderboard_name": "etu_speedrun",
             "score_changed": true, "rank_previous": 52, "rank_new": 37 }
}
```

`steam` is `null` for unverified runs, `{ "mirrored": false, "error": "no_steam_board_for_mode" }`
for `global`, and `{ "mirrored": false, "error": "steam_unavailable" | "not_configured" }` when
the mirror failed (the ETU score is still saved; nothing to retry).

Errors: `unauthorized` (401), `invalid_ticket` (401, only when no bearer was sent), `account_mismatch`
(403, the ticket's Steam ID is not the one linked to this account), `bad_request` (400, see
`message`), `rate_limited` (429, 30 per minute per account).

Steam leaderboards keep each player's **best** score (`KeepBest`), so re-submitting a lower run is a
no-op on Steam. The boards are created with *trusted writes only*: uploading directly from the
client with `UploadLeaderboardScore` will be rejected by Steam, and that is intended. Read them
with `DownloadLeaderboardEntries` as usual, or via section 4.

Offline: queue `{body, ticket-less}` submissions on disk and replay them with a fresh ticket when
the network returns; a ticket is only valid for a short time, so don't store tickets.

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

- `GET /api/leaderboard?mode=speedrun&window=30d&page=1&pageSize=25` — the website's score log
  (verified runs; one row per run). Public, no auth.
- `GET /api/leaderboard/steam?mode=speedrun&start=1&count=50` — Steam's global board joined to ETU
  profiles (callsign, avatar, verified-owner flag). `&around=<steamid>` returns the window around
  that player instead. Public, cached 60 s.

## 5. Feedback — `POST /api/feedback`

See `GAME_FEEDBACK_INTEGRATION.md`; send `"source": "game"` and the bearer if signed in.

## 6. Error handling checklist for the client

| Situation | What to do |
|---|---|
| `401 unauthorized` on any game route | Access token expired: call `steam-session` again, retry once |
| `403 account_mismatch` | The Steam account running the game isn't the one linked to this ETU account; show "sign in with the Steam account linked to your profile" |
| `403 account_suspended` | Show the website's support link; don't retry |
| `429 rate_limited` | Back off `retry_after` seconds |
| `502 steam_unavailable` / `503 not_configured` on `steam-session` | Play offline; retry sign-in later |
| `is_verified: false` on a score | Tell the player the run was recorded but is pending verification; it won't appear on Steam |

## 7. Server configuration (website side)

| Variable | Needed for |
|---|---|
| `STEAM_PUBLISHER_KEY` | ticket validation, ownership checks, Steam leaderboards (partner.steam-api.com) |
| `STEAM_APP_ID` | defaults to `4094340` |
| `STEAM_LEADERBOARD_TRUSTED_WRITES` | `true` (default) creates boards that only the server can write. Set `false` *before the boards are first created* if the game must keep uploading client-side |
| `STEAM_WEB_API_KEY` | persona/avatar lookups only |

Steam leaderboard names are `etu_<mode>` (`etu_speedrun`, `etu_survival`, `etu_discovery`,
`etu_boss_rush`). They are created on first use; nothing to set up in Steamworks beforehand.
