# ETU 2175 — User Sign-in / Sign-up Flow Design Document

**Version:** 1.0
**Last Updated:** 2026-03-04
**Steam App ID:** 4094340
**Status:** Active Development — Pre-Alpha

---

## Table of Contents

1. [Overview & Goals](#1-overview--goals)
2. [User Journey Maps](#2-user-journey-maps)
3. [Authentication Methods](#3-authentication-methods)
4. [Verification Tiers & Access Gates](#4-verification-tiers--access-gates)
5. [Username System](#5-username-system)
6. [Magic Link — Architecture & Fix](#6-magic-link--architecture--fix)
7. [Forgot Password & Account Recovery](#7-forgot-password--account-recovery)
8. [Apple & Google OAuth](#8-apple--google-oauth)
9. [Steam Integration — Login & Purchase Verification](#9-steam-integration--login--purchase-verification)
10. [Discord Integration](#10-discord-integration)
11. [Game Client Authentication](#11-game-client-authentication)
12. [Profile Page — Security & Account Management](#12-profile-page--security--account-management)
13. [Navigation & Page Fixes](#13-navigation--page-fixes)
14. [Database Schema Changes](#14-database-schema-changes)
15. [API Endpoints Required](#15-api-endpoints-required)
16. [Pages to Build / Update](#16-pages-to-build--update)
17. [Implementation Phases](#17-implementation-phases)
18. [Open Questions & Future Work](#18-open-questions--future-work)

---

## 1. Overview & Goals

ETU 2175 is a custom-engine space adventure game with a web presence that serves as the primary identity hub. The auth system must:

- **Be seamless** — a player should go from landing page to playing in under 2 minutes
- **Work across platforms** — PC, Mac, Linux, Steam Deck, and the web share one account
- **Support the alpha timeline** — Summer 2026 demo, full release 9/30/2026
- **Earn trust** — no dark patterns, clear recovery paths, professional security
- **Enable the leaderboard** — scores must tie to verified accounts

### Guiding Principles

1. Never strand a user (every dead end has a recovery path)
2. Email is the universal fallback for account recovery
3. Steam is the primary identity for purchased game access
4. Magic link = fastest path to leaderboard access
5. Username is the player-facing identity; email is the system identity

---

## 2. User Journey Maps

### 2.1 New User — Web Sign-Up (Email)

```
Landing Page
    ↓  clicks "Sign In" in nav
/login (signup tab)
    ↓  enters email + password
    ↓  chooses or accepts auto-set commander name
    ↓  submits
API creates account + profile
    ↓  magic link email sent immediately for verification
Redirect to /dashboard
    ↓  banner: "Verify your email for full access — check your inbox"
User clicks email link
    ↓  magic link callback authenticates & verifies
Redirect to /dashboard (verified state)
    ↓  banner: "Link Steam to unlock ranked play" [optional]
```

### 2.2 Returning User — Email Login

```
/login (login tab)
    ↓  enters email OR username
    ↓  enters password
    ↓  submits
API authenticates, sets session cookie (SameSite: lax)
Redirect to original destination or /dashboard
```

### 2.3 Returning User — Magic Link (Passwordless)

```
/login (login tab)
    ↓  enters email OR username
    ↓  clicks "Send me a magic link"
Email sent via Resend
    ↓  user clicks link in email client
/api/auth/magic-link/callback
    ↓  verifies token
    ↓  sets session cookie (SameSite: lax — critical fix)
    ↓  ensures profile exists
Redirect to original destination or /dashboard
```

### 2.4 New User — Steam Sign-Up

```
/login
    ↓  clicks Steam button
/api/steam/auth → Steam OpenID
    ↓  user authenticates on Steam
/api/steam/callback
    ↓  verifies OpenID signature
    ↓  fetches Steam profile + avatar
    ↓  creates ETU account linked to Steam
    ↓  checks game ownership (App ID 4094340)
Redirect to /login?message=steam_linked OR /profile (if new)
    ↓  if new user: prompt to set commander name + password (optional)
```

### 2.5 Existing User — Link Steam to Account

```
/profile → Settings tab
    ↓  clicks "Link Steam Account"
/api/steam/auth?link=true (attaches to existing session)
    ↓  Steam OpenID flow
/api/steam/callback
    ↓  links Steam ID to existing profile
    ↓  verifies game ownership
    ↓  updates is_verified_owner flag
Redirect to /profile?message=steam_linked
    ↓  "Steam Verified" badge appears on profile
```

### 2.6 Forgot Password

```
/login
    ↓  clicks "Forgot password?"
/forgot-password
    ↓  enters email OR username
API looks up account by email or username
    ↓  sends password reset email via Resend
    ↓  link contains token (1 hour TTL)
/reset-password?token=XXX
    ↓  user enters new password + confirm
    ↓  password validated (strength requirements)
API updates password via Supabase Admin
    ↓  invalidates all other sessions
Redirect to /login?message=password_reset
    ↓  "Password updated. Please log in."
```

### 2.7 Forgot Username

```
/login
    ↓  clicks "Forgot username?"
Modal/page: enter email address
API looks up profile by email
    ↓  sends email: "Your commander name is: [username]"
    ↓  includes link to log in
Success message: "Check your email for your commander name"
```

### 2.8 Apple or Google Sign-In

```
/login
    ↓  clicks Apple / Google button
Supabase OAuth redirect → Apple/Google consent screen
    ↓  user approves
Supabase OAuth callback → /api/auth/oauth/callback
    ↓  exchange code for session
    ↓  create or link profile
    ↓  set session cookie
Redirect to /dashboard
    ↓  if new user: prompt to choose commander name
```

### 2.9 Game Client — First Sign-In (Device Code Flow)

```
Game client launches, user not authenticated
    ↓  game shows: "Sign in at etu2175.com/auth/device"
    ↓  game calls POST /api/game/device-code
    ↓  receives device_code + user_code (8-char readable: "STAR-7842")
Game displays code + QR code + URL
    ↓  polls GET /api/game/token?device_code=XXX every 5s
User opens browser → /auth/device
    ↓  enters user code OR scans QR
    ↓  signs in with any method (email, Steam, Apple, Google)
    ↓  code is bound to user session
Game poll → receives access_token (JWT) + refresh_token
Game stores tokens securely
    ↓  uses JWT for: score submission, profile sync, leaderboard
    ↓  refreshes token automatically before expiry
```

### 2.10 Alpha Testing Application Flow

```
/alpha-testing page → "Apply for Alpha Access"
    ↓  if not signed in: redirect to /login?redirect=/alpha-testing
/login (signup tab auto-selected)
    ↓  creates account
Redirect to /alpha-testing
    ↓  fills out application form
    ↓  submits application
Discord webhook fires: "New alpha application from [username]"
    ↓  admin reviews, approves
Admin marks profile.is_alpha_tester = true
User gets email: "You're in! Access your alpha build..."
    ↓  Discord OAuth prompt: "Join the ETU Alpha Discord"
```

---

## 3. Authentication Methods

### Available Methods (by priority)

| Method | Status | Use Case | Notes |
|--------|--------|----------|-------|
| Email + Password | ✅ Exists | Standard account access | Needs username-or-email login |
| Magic Link (email) | ✅ Exists (fix needed) | Passwordless, fastest onboarding | Fix: SameSite cookie |
| Steam OpenID | ✅ Exists | Primary game identity | Add ownership check |
| Apple Sign-In | 🔲 To Build | Mobile/Mac users, iOS gamers | Supabase OAuth provider |
| Google Sign-In | 🔲 To Build | General audience | Supabase OAuth provider |
| GitHub Sign-In | ❌ Remove | Not target audience | Remove button |
| Game Device Code | 🔲 To Build | In-game auth | JWT-based flow |

### Session Architecture

- **Web sessions:** HTTP-only cookie `etu_session`, 7-day expiry, **SameSite: lax** (was strict — this broke magic links)
- **Game sessions:** JWT access token (1 hour) + refresh token (30 days), stored by game client
- **Session data:** `{ userId, email, role, csrfToken }`
- **Admin override:** `is_admin` role bypasses privacy gates

---

## 4. Verification Tiers & Access Gates

Players unlock features progressively. No feature should be completely locked — everyone gets something.

### Tier 0 — Visitor (not signed in)
- View public profiles
- View leaderboard (read-only)
- View game info, factions, roadmap, backlog

### Tier 1 — Registered (email created, unverified)
- Dashboard access
- Submit feedback / backlog votes
- View own profile

### Tier 2 — Email Verified
- Leaderboard score submission (web scores)
- Full profile visibility controls
- Match history

### Tier 3 — Steam Linked
- Game scores appear on leaderboard
- Steam avatar + profile data synced
- Ship designer unlocked

### Tier 4 — Steam Verified Owner (App ID 4094340 confirmed)
- Ranked play leaderboard
- Alpha testing application eligibility
- `is_verified_owner` badge on profile

### Tier 5 — Alpha Tester (manually approved)
- Alpha build download access
- Alpha Discord server access
- `☢️ Alpha Tester` badge

---

## 5. Username System

### Rules
- Auto-generated at signup from email prefix (e.g., `elliot` from `elliot@...`)
- Unique across all users (enforced at DB level with UNIQUE constraint — already exists)
- 3–24 characters
- Alphanumeric + underscore + hyphen only: `^[a-zA-Z0-9_-]{3,24}$`
- Case-insensitive uniqueness (stored lowercase, displayed as-set)
- Editable once per 30 days from profile settings
- Cannot be a reserved word (admin, moderator, system, etu, support, etc.)

### Login with Username or Email
- The login form's email/username field auto-detects input:
  - Contains `@` → treat as email
  - No `@` → look up by username in profiles table, get email, authenticate
- The API `/api/auth/login` accepts `{ emailOrUsername, password }` and resolves internally
- The magic link flow similarly resolves username → email before sending

### Username Change (Profile Settings)
- Available in profile Settings tab
- Shows current username, input for new one
- Real-time availability check (debounced, `/api/auth/check-username?username=XXX`)
- "Last changed X days ago" — blocked for 30 days after change
- Confirmation dialog before save

---

## 6. Magic Link — Architecture & Fix

### Root Cause: SameSite: strict Cookie

When a user clicks a magic link in their email client, the browser considers this a **cross-site navigation** (referrer is external). With `SameSite: strict`, the browser refuses to send or set the cookie because the request didn't originate from the same site.

**Fix:** Change all auth session cookies from `SameSite: strict` → `SameSite: lax`.

`Lax` still protects against CSRF for dangerous mutations (POST/PUT/DELETE) because it only allows cookies on **top-level GET navigations** from external sites. This is the standard for auth session cookies (used by GitHub, Vercel, etc.).

### Magic Link Flow (After Fix)

1. User enters email or username, clicks "Send magic link"
2. `POST /api/auth/magic-link` → resolves username to email if needed → generates Supabase OTP → sends via Resend
3. User clicks link in email → browser navigates to `/api/auth/magic-link/callback?token_hash=XXX&type=email`
4. Callback verifies OTP with Supabase Admin
5. Profile existence ensured (with retry)
6. Session cookie set (`SameSite: lax`) → redirect to destination
7. User is now authenticated and their session persists

### Magic Link Email Improvements
- Subject: "Your ETU 2175 sign-in link, Commander"
- Body: commander-themed, shows username if known
- Expiry warning: "Link expires in 1 hour"
- Fallback: "If you didn't request this, ignore this email"

---

## 7. Forgot Password & Account Recovery

### Forgot Password Flow

**New page:** `/forgot-password`

1. User visits `/login`, clicks "Forgot password?"
2. Navigates to `/forgot-password`
3. Enters email or username
4. `POST /api/auth/forgot-password`:
   - Resolves username → email
   - Generates Supabase password reset token
   - Sends email via Resend with reset link → `/reset-password?token=XXX`
   - Always returns success (don't reveal if email exists — prevents enumeration)
5. User clicks link → `/reset-password?token=XXX`
6. User enters new password + confirm, validated against password rules
7. `POST /api/auth/reset-password`:
   - Verifies token is valid and unexpired
   - Updates password via Supabase Admin
   - Invalidates all existing sessions for that user
   - Returns success
8. Redirect to `/login?message=password_reset`

### Forgot Username Flow

**No separate page needed — modal on /login**

1. User clicks "Forgot username?" link under the username/email field
2. Modal opens: "Enter your email to recover your commander name"
3. Enters email → `POST /api/auth/forgot-username`
4. Looks up profile by email
5. Sends email: "Your commander name is: **{username}**\n\nSign in at: [link]"
6. Always returns success (no email enumeration)
7. Modal shows: "If an account exists with that email, you'll receive your commander name shortly."

### Password Reset from Profile Settings

- Profile → Settings tab → "Security" section
- "Change Password" button
- Inline form: current password + new password + confirm
- `POST /api/auth/change-password` with CSRF token
- Or option: "Send reset link to my email" (uses same forgot-password flow)

### Account Recovery Fallbacks

| Scenario | Recovery Path |
|----------|--------------|
| Forgot password, have email | Forgot password → email reset link |
| Forgot password, have Steam | Log in via Steam → set password in profile |
| Forgot email, have Steam | Steam login → profile shows email |
| Forgot everything | Contact support (link in forgot-password page) |
| Magic link expired | Request new magic link |
| Account locked (rate limited) | Wait 1 hour, or contact support |

---

## 8. Apple & Google OAuth

### Implementation via Supabase OAuth

Supabase handles Apple and Google OAuth natively. The flow:

1. User clicks "Continue with Apple/Google"
2. `GET /api/auth/oauth/start?provider=apple|google` → Supabase generates OAuth URL
3. Redirect to Apple/Google consent screen
4. Callback: `GET /api/auth/oauth/callback?code=XXX&state=XXX`
5. Exchange code for Supabase session
6. Create ETU profile if new user
7. Set session cookie
8. If new user (no username set): redirect to `/auth/choose-username`
9. Otherwise: redirect to destination

### Apple Sign-In (Priority)

**Requirements:**
- Apple Developer account with "Sign in with Apple" capability
- Services ID configured at developer.apple.com
- Private key (.p8 file) for JWT generation
- Domain verification (Apple requires `.well-known/apple-developer-domain-association.txt`)
- Supabase: enable Apple provider, add client ID + secret

**Special considerations:**
- Apple only sends name on first sign-in — must store it immediately
- Apple provides a relay email (`xyz@privaterelay.appleid.com`) — treat as valid email
- Apple requires privacy policy and terms of service URLs

### Google Sign-In

**Requirements:**
- Google Cloud project with OAuth consent screen configured
- Redirect URI: `https://[supabase-project].supabase.co/auth/v1/callback`
- Client ID + Secret in Supabase dashboard
- Supabase: enable Google provider

### GitHub Sign-In (Remove)

GitHub is a developer tool — not the target gaming audience. Remove the button and the dead `handleOAuth('github')` call to reduce confusion.

### New User Post-OAuth

After OAuth sign-in, if a user's profile has no username set (or has a system-generated one), redirect them to `/auth/choose-username` before sending to dashboard:

```
/auth/choose-username
    ↓  "Choose your commander name"
    ↓  pre-filled suggestion from OAuth display name
    ↓  real-time availability check
    ↓  submit → update profile username
Redirect to /dashboard
```

---

## 9. Steam Integration — Login & Purchase Verification

### Steam App ID: 4094340

### Current State
- Steam OpenID login works ✅
- Steam profile fetch (avatar, username) works ✅
- Purchase verification: NOT implemented ❌
- Steam link from profile settings: NOT implemented ❌

### Purchase Verification

After any Steam auth (login or link), call Steam Web API to check ownership:

```
GET https://api.steampowered.com/ISteamUser/CheckAppOwnership/v1/
  ?key={STEAM_WEB_API_KEY}
  &steamid={user_steam_id}
  &appid=4094340
```

Response: `{ "appownership": { "ownsapp": true/false, "permanent": true/false, ... } }`

If `ownsapp === true`:
- Set `profile.is_verified_owner = true`
- Set `profile.steam_purchase_verified_at = now()`
- Enable ranked leaderboard submission

### Steam Link from Profile (New)

In Profile → Settings → "Connected Accounts" section:

- **Unlinked state:** "Link Steam Account" button → `/api/steam/auth?link=true`
- **Linked state:** Shows Steam avatar, username, `steam_id` (last 4 chars shown)
  - "Unlink Steam" option (confirmation required)
  - "Verify Game Ownership" if not yet verified
  - Steam Verified badge if `is_verified_owner = true`

### Steam Link Intent (`link=true` param)

When `/api/steam/auth?link=true` is hit:
- Require existing authenticated session
- Store intent in session before redirect
- Callback: instead of creating new account, attach Steam ID to existing profile

### Edge Cases
- Steam ID already linked to another account → show error, offer support link
- Unlink Steam: clear `steam_id`, `is_verified_owner`, `steam_purchase_verified_at`
- Game not owned: show message "Ownership verification failed — ensure you're signed in to the correct Steam account"

---

## 10. Discord Integration

### Current State
- Discord webhook URL configured in env ✅
- No bot integration ❌
- No OAuth ❌

### Phase 1 — Webhook Notifications (Quick Win)
Fire Discord webhook notifications on:
- New user signup (username, email prefix, signup method)
- Alpha application submitted (username, application summary)
- Alpha application approved (username)
- New verified Steam owner (username, steam profile link)

### Phase 2 — Discord OAuth (Join Server)
After signup or from profile settings:

1. "Join the ETU Discord" button → `/api/discord/oauth/start`
2. Discord consent: authorize → ETU bot can add them to server
3. `/api/discord/oauth/callback` → exchange code for token
4. Call Discord API to add user to ETU guild with `Verified Player` role
5. Alpha testers: also get `Alpha Tester` role
6. Profile: store `discord_id`, show "Discord Connected" badge

**Discord OAuth Scopes needed:** `identify email guilds.join`

**Bot requires:** `guilds.join` permission, bot must be in the server with "Manage Roles" permission

### Phase 3 — Role Sync
- On is_alpha_tester approval: bot assigns Alpha Tester role in Discord
- On is_verified_owner: bot assigns Verified Owner role
- Webhook for major achievements / leaderboard milestones

---

## 11. Game Client Authentication

### Background

ETU 2175 uses a custom game engine. The web auth system uses HTTP-only cookies which native apps cannot access. A separate token-based auth system is needed for the game client.

### Device Code Flow (RFC 8628 inspired)

This is the same pattern used by Xbox sign-in, VS Code GitHub auth, and game consoles.

#### Step 1 — Game requests device code

```
POST /api/game/device-code
Response: {
  device_code: "eyJ...",           // server-side opaque token
  user_code: "STAR-7842",          // human-readable 8-char code
  verification_uri: "https://etu2175.com/auth/device",
  qr_code_uri: "https://etu2175.com/auth/device?code=STAR-7842",
  expires_in: 600,                  // 10 minutes
  interval: 5                       // poll every 5 seconds
}
```

#### Step 2 — Game displays code + QR code to user

```
┌─────────────────────────────────────┐
│  Sign in to ETU 2175                │
│                                     │
│  Visit:  etu2175.com/auth/device    │
│  Enter:  STAR-7842                  │
│                                     │
│  [QR CODE]                          │
│                                     │
│  Waiting for sign-in...  ⏳        │
└─────────────────────────────────────┘
```

#### Step 3 — Game polls for token

```
GET /api/game/token?device_code=eyJ...
→ 202 Accepted: { status: "pending" }   (not yet signed in)
→ 200 OK: { access_token, refresh_token, user_id, username }  (done)
→ 410 Gone: { error: "expired" }        (code expired)
```

#### Step 4 — User signs in on web

User navigates to `/auth/device` on any browser (phone, computer):
- Shows "Enter your game code" field (pre-filled from URL if QR scanned)
- User signs in with any method (email, Steam, Apple, Google, magic link)
- Code is associated with user
- Next poll by game receives the JWT

#### Step 5 — Game uses JWT

```
Authorization: Bearer {access_token}

POST /api/game/scores      - submit score
GET  /api/game/profile     - get player profile
POST /api/game/session     - game session start/end
GET  /api/game/leaderboard - get leaderboard
```

#### Token Details
- **Access token:** JWT, 1 hour TTL, contains `{ userId, username, role, tier }`
- **Refresh token:** Opaque, 30 days TTL, stored in `game_sessions` table
- **Refresh:** `POST /api/game/refresh` with refresh token → new access token

### Custom Engine Integration Notes

Since the game uses a custom engine:
- Store JWT and refresh token in a local config file or OS keychain
- Use HTTP client to call API endpoints above
- Implement token refresh before expiry (check `exp` in JWT)
- On network failure: queue score submissions locally, sync when reconnected
- Deep link for device page (optional): `etu2175://auth/device`

---

## 12. Profile Page — Security & Account Management

### Current Issues to Fix

1. **Settings tab shows `profile.id` (UUID) in email field — BUG** → Show actual email from session
2. **No password change functionality** → Add "Security" section
3. **No Steam link/unlink UI** → Add "Connected Accounts" section
4. **"Reset Statistics" and "Delete Account" are non-functional stubs** → Implement with confirmation modals or remove until ready

### Profile Settings — Redesigned Tabs

#### Tab: Settings → Sub-sections

**Commander Info**
- Username (editable, 30-day cooldown, availability check)
- Faction choice
- Ship class

**Security**
- Email display (read-only, correct value from session)
- Change Password (inline form or send reset email)
- Active Sessions list (future)
- Two-factor auth (future)

**Connected Accounts**
- Steam: link/unlink, shows Steam username + avatar if linked, ownership verification status
- Discord: link/unlink, shows Discord username if linked
- Apple: link/unlink (if signed in via Apple)
- Google: link/unlink (if signed in via Google)

**Privacy**
- Public profile toggle (already works ✅)
- Hide match history (future)
- Allow friend requests (future)

**Danger Zone**
- Reset Statistics → confirmation modal: "Type RESET to confirm" → functional
- Delete Account → confirmation modal: "Type DELETE to confirm" → functional + email confirmation

---

## 13. Navigation & Page Fixes

### Login Page Missing Header

The `/login` page has no `<Header />` component. Users have no navigation context, no "back to home" in the header (only a small footer link). Fix: add `<Header />` to the login page.

**Note:** The Header should handle the unauthenticated state gracefully — showing "Sign In" button even on the login page (which could scroll to the form, or show a subtle "you're already here" state).

### Pages Needing Nav Added
- `/login` — add `<Header />` and `<Footer />`

### New Pages to Create
- `/forgot-password` — with Header + Footer
- `/reset-password` — with Header + Footer
- `/auth/device` — with Header + Footer
- `/auth/choose-username` — with Header + Footer (post-OAuth flow)

### Header Improvements
- Authenticated state: show username + avatar, link to `/profile`
- Unauthenticated state: show "Sign In" button
- Active page highlighting (currently missing on some pages)

---

## 14. Database Schema Changes

### profiles Table — New Columns

```sql
-- Steam ownership verification
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_verified_owner BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS steam_purchase_verified_at TIMESTAMPTZ,

-- Discord integration
  ADD COLUMN IF NOT EXISTS discord_id TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS discord_username TEXT,

-- Username change tracking
  ADD COLUMN IF NOT EXISTS username_last_changed_at TIMESTAMPTZ,

-- Email verification
  ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ,

-- Auth methods
  ADD COLUMN IF NOT EXISTS auth_providers TEXT[] DEFAULT '{}';
  -- values: 'email', 'steam', 'apple', 'google', 'magic_link'
```

### game_sessions Table — New

```sql
CREATE TABLE IF NOT EXISTS game_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  refresh_token TEXT UNIQUE NOT NULL,
  device_info TEXT,  -- "ETU 2175 vX.X.X | Windows 11"
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  is_revoked BOOLEAN DEFAULT false
);

-- Index for token lookup
CREATE INDEX idx_game_sessions_refresh_token ON game_sessions(refresh_token);
CREATE INDEX idx_game_sessions_user_id ON game_sessions(user_id);
```

### password_reset_tokens Table — New

```sql
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  token_hash TEXT UNIQUE NOT NULL,  -- bcrypt hash of the token
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### device_auth_codes Table — New

```sql
CREATE TABLE IF NOT EXISTS device_auth_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_code TEXT UNIQUE NOT NULL,
  user_code TEXT UNIQUE NOT NULL,  -- "STAR-7842"
  user_id UUID REFERENCES profiles(id),  -- null until user signs in
  expires_at TIMESTAMPTZ NOT NULL,
  authorized_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 15. API Endpoints Required

### Existing — Needs Modification

| Endpoint | Change |
|----------|--------|
| `POST /api/auth/login` | Accept `emailOrUsername` field; resolve username → email |
| `POST /api/auth/signup` | Add username choice field; add `auth_providers` tracking |
| `POST /api/auth/magic-link` | Accept username; resolve to email |
| `GET /api/auth/magic-link/callback` | Fix cookie: SameSite lax |
| `GET /api/steam/callback` | Add ownership check; handle `link=true` intent |
| `lib/session.ts` | Change SameSite: strict → lax |

### New — Auth

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/auth/forgot-password` | POST | Send password reset email |
| `/api/auth/reset-password` | POST | Apply new password with token |
| `/api/auth/change-password` | POST | Change password (authenticated) |
| `/api/auth/forgot-username` | POST | Send username reminder email |
| `/api/auth/check-username` | GET | Check username availability |
| `/api/auth/oauth/start` | GET | Start Apple/Google OAuth |
| `/api/auth/oauth/callback` | GET | Handle OAuth callback |

### New — Game Client

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/game/device-code` | POST | Request device auth code |
| `/api/game/token` | GET | Poll for/exchange JWT |
| `/api/game/refresh` | POST | Refresh access token |
| `/api/game/profile` | GET | Get player profile (JWT auth) |
| `/api/game/scores` | POST | Submit game score (JWT auth) |
| `/api/game/leaderboard` | GET | Get leaderboard (JWT auth) |
| `/api/game/session` | POST | Start/end game session |

### New — Discord

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/discord/oauth/start` | GET | Start Discord OAuth |
| `/api/discord/oauth/callback` | GET | Handle Discord callback |
| `/api/discord/unlink` | POST | Remove Discord connection |

### New — Steam

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/steam/verify-ownership` | POST | Trigger ownership re-check |
| `/api/steam/unlink` | POST | Remove Steam connection |

### New — Device Auth Page

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/auth/device/authorize` | POST | Link device code to user session |

---

## 16. Pages to Build / Update

| Page | Status | Priority | Changes |
|------|--------|----------|---------|
| `/login` | Update | P0 | Add Header/Footer, email-or-username input, forgot links, remove GitHub, Apple+Google working |
| `/forgot-password` | Build | P0 | New page: enter email/username → send reset link |
| `/reset-password` | Build | P0 | New page: enter new password with token validation |
| `/profile` | Update | P0 | Fix email bug, add Security section, Connected Accounts section |
| `/auth/choose-username` | Build | P1 | Post-OAuth username selection |
| `/auth/device` | Build | P1 | Game client sign-in page |
| `/forgot-username` | Modal | P1 | Modal on login page (not separate page) |

---

## 17. Implementation Phases

### Phase 1 — Foundation Fixes (Now) ✨
Critical bugs and missing basics. Do this before the summer demo.

1. Fix magic link cookie: `SameSite: lax` in `lib/session.ts`
2. Add `<Header />` and `<Footer />` to `/login` page
3. Fix profile settings email display bug (shows UUID instead of email)
4. Remove GitHub OAuth button
5. Update login form: email OR username input field
6. Update `/api/auth/login` to accept emailOrUsername
7. Add "Forgot password?" and "Forgot username?" links to login form
8. Build `/forgot-password` page + API endpoint
9. Build `/reset-password` page + API endpoint
10. Add Security section to profile Settings tab (change password)

### Phase 2 — OAuth & Integrations (Pre-Demo)
For the summer demo, players need frictionless onboarding.

1. Implement Apple Sign-In via Supabase OAuth
2. Implement Google Sign-In via Supabase OAuth
3. Build `/auth/choose-username` post-OAuth page
4. Add Steam purchase verification (App ID 4094340) to Steam callback
5. Add "Connected Accounts" section to profile Settings tab
6. Steam link/unlink from profile
7. Discord webhook improvements (signup notifications)

### Phase 3 — Game Client Auth (Pre-Launch, Before 9/30)
Required for game + web to share the same identity.

1. Build device auth code flow (POST /api/game/device-code, GET /api/game/token)
2. Build `/auth/device` page
3. Build game JWT endpoints (scores, profile, leaderboard)
4. Database: game_sessions table
5. Custom engine integration documentation

### Phase 4 — Discord Deep Integration (Post-Launch)
Nice-to-have for community building.

1. Discord OAuth (join server automatically)
2. Role sync (verified owner, alpha tester roles)
3. Achievement notifications

---

## 18. Open Questions & Future Work

### Open Questions

1. **Username change cooldown:** 30 days is standard — is this right for alpha?
2. **Email for purchased players:** Should we pro-actively reach out to Steam buyers to create an account?
3. **Magic link auto-signup:** Currently creates an account if none exists. Should this be opt-in or opt-out?
4. **Session length:** 7 days web, 30 days game — is this appropriate?
5. **Admin approval for alpha testers:** Manual review or automatic based on criteria?

### Future Work (Post 1.0)
- Two-factor authentication (TOTP + backup codes)
- Passkey / WebAuthn support
- Ban system with ban appeals
- Session management (view/revoke active sessions)
- Account merge (Steam + email accounts → one account)
- Parental controls / age verification
- Regional compliance (GDPR data export/deletion, COPPA)

---

*Document maintained by the ETU 2175 development team.*
*For questions or updates, open an issue at the GitHub repository.*
