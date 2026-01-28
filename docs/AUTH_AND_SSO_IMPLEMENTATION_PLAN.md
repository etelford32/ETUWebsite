# ETU 2175 Authentication & SSO Implementation Plan

## Overview

This document outlines the authentication architecture and Single Sign-On (SSO) implementation plan for Explore the Universe 2175.

---

## Current Authentication State

### What's Implemented

| Feature | Status | Notes |
|---------|--------|-------|
| Email/Password Login | Complete | Rate-limited, secure cookies |
| Email/Password Signup | Complete | Password validation, auto-profile creation |
| Magic Link Login | Complete | Passwordless authentication via email |
| Session Management | Complete | HTTP-only cookies, 7-day expiration |
| CSRF Protection | Complete | Token-based validation for mutations |
| Steam Login | Partial | UI button exists, needs OAuth flow |
| Google Login | UI Only | Button exists, needs implementation |
| GitHub Login | UI Only | Button exists, needs implementation |
| Apple Login | UI Only | Button exists, needs implementation |

### Current Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     CURRENT AUTH FLOW                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  User → /login?redirect=/alpha-testing                          │
│           │                                                     │
│           ├─→ Email/Password → /api/auth/signup or /login       │
│           │         │                                           │
│           │         └─→ Set session cookie → Redirect           │
│           │                                                     │
│           ├─→ Magic Link → /api/auth/magic-link                 │
│           │         │                                           │
│           │         └─→ Email sent → User clicks → Callback     │
│           │                   │                                 │
│           │                   └─→ Set session cookie → Redirect │
│           │                                                     │
│           └─→ OAuth (Steam/Google/etc) → TODO                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## SSO Implementation Plan

### Priority Order

1. **Steam** (Highest Priority - Primary gaming platform)
2. **Discord** (High Priority - Community platform)
3. **Google** (Medium Priority - Universal)
4. **GitHub** (Low Priority - Developer audience)
5. **Apple** (Low Priority - iOS/Mac users)

---

## 1. Steam OAuth Implementation

### Why Steam First?
- Primary gaming platform for ETU 2175
- Steam ID links game progress to web account
- Existing UI button and partial implementation

### Implementation Steps

#### Step 1: Supabase Configuration
```sql
-- Supabase Dashboard > Authentication > Providers > Steam
-- Enable Steam provider
-- Add Steam API Key from: https://steamcommunity.com/dev/apikey
```

#### Step 2: API Routes

**File: `/src/app/api/auth/steam/route.ts`**
```typescript
// Initiates Steam OAuth flow
// Redirects user to Steam login page
// Includes redirect parameter for post-auth navigation
```

**File: `/src/app/api/auth/steam/callback/route.ts`**
```typescript
// Handles Steam OAuth callback
// Creates/links user account
// Sets session cookie
// Redirects to intended destination
```

#### Step 3: Account Linking
- If user already has email account, link Steam ID
- If new user, create account with Steam data
- Store `steam_id` in profiles table (column exists)

#### Step 4: Profile Integration
- Display Steam avatar if no custom avatar
- Show Steam username as default username
- Link to Steam profile from user profile

### Steam API Data Available
- Steam ID (64-bit)
- Display name
- Avatar URL (small, medium, full)
- Profile URL
- Online status

---

## 2. Discord OAuth Implementation

### Why Discord?
- Community engagement platform
- Alpha tester coordination
- Real-time communication

### Implementation Steps

#### Step 1: Discord Application Setup
1. Go to https://discord.com/developers/applications
2. Create application "ETU 2175"
3. Get Client ID and Client Secret
4. Add redirect URI: `https://yoursite.com/api/auth/discord/callback`

#### Step 2: API Routes

**File: `/src/app/api/auth/discord/route.ts`**
```typescript
// Initiates Discord OAuth flow
// Scopes: identify, email
```

**File: `/src/app/api/auth/discord/callback/route.ts`**
```typescript
// Handles Discord OAuth callback
// Creates/links user account
// Optionally joins user to ETU Discord server
```

#### Step 3: Database Schema Addition
```sql
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS discord_id TEXT UNIQUE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS discord_username TEXT;
```

### Discord API Data Available
- Discord ID
- Username + Discriminator
- Avatar URL
- Email (with email scope)
- Server memberships (with guilds scope)

---

## 3. Google OAuth Implementation

### Implementation Steps

#### Step 1: Google Cloud Console Setup
1. Create project in Google Cloud Console
2. Enable Google+ API
3. Create OAuth 2.0 credentials
4. Add authorized redirect URIs

#### Step 2: Supabase Configuration
```
Supabase Dashboard > Authentication > Providers > Google
- Enable Google provider
- Add Client ID and Client Secret
```

#### Step 3: API Routes
Follow same pattern as Steam/Discord with Google-specific handling.

---

## 4. GitHub OAuth Implementation

### Implementation Steps

#### Step 1: GitHub OAuth App Setup
1. Go to GitHub Settings > Developer settings > OAuth Apps
2. Create new OAuth App
3. Get Client ID and Client Secret

#### Step 2: Supabase Configuration
Enable GitHub provider in Supabase dashboard.

---

## 5. Apple OAuth Implementation

### Implementation Steps

#### Step 1: Apple Developer Setup
1. Enroll in Apple Developer Program
2. Create App ID with Sign in with Apple capability
3. Create Service ID for web authentication
4. Create private key for client secret generation

#### Step 2: Supabase Configuration
Enable Apple provider with appropriate credentials.

**Note:** Apple requires HTTPS and a verified domain.

---

## Architecture Decisions

### Session Management

```typescript
// Session stored in HTTP-only cookie
interface SessionData {
  userId: string      // Supabase user ID
  email: string       // User's email
  role?: string       // 'user' | 'admin' | 'staff'
  csrfToken?: string  // CSRF protection token
}
```

### Account Linking Strategy

1. **Primary Identifier:** Supabase Auth user ID
2. **Secondary Identifiers:**
   - `steam_id` in profiles table
   - `discord_id` in profiles table (to add)
   - Email (unique constraint)

3. **Linking Rules:**
   - If OAuth email matches existing account → Link
   - If no match → Create new account
   - User can manually link additional providers from profile

### Provider Data Sync

| Provider | Data Synced | Frequency |
|----------|-------------|-----------|
| Steam | Avatar, Display Name | On login |
| Discord | Avatar, Username | On login |
| Google | Avatar, Display Name | On signup only |
| GitHub | Avatar, Username | On signup only |
| Apple | Name, Email | On signup only |

---

## Security Considerations

### CSRF Protection
- All mutating API routes require CSRF token
- Token stored in session, validated on server
- Exempt: OAuth callbacks (use state parameter instead)

### OAuth State Parameter
- Generate random state on OAuth initiation
- Store in short-lived cookie (5 minutes)
- Validate on callback to prevent CSRF

### Rate Limiting
- Login: 5 attempts per 15 minutes per email+IP
- Signup: 3 attempts per hour per email+IP
- Magic Link: 3 attempts per hour per email+IP
- OAuth: 10 attempts per hour per IP

### Token Security
- Session cookies: `HttpOnly`, `Secure`, `SameSite=Strict`
- Magic link tokens: Single-use, 1-hour expiration
- OAuth tokens: Never stored client-side

---

## API Route Structure

```
/api/auth/
├── login/route.ts          ✅ Complete
├── signup/route.ts         ✅ Complete
├── logout/route.ts         ✅ Complete
├── session/route.ts        ✅ Complete
├── magic-link/
│   ├── route.ts            ✅ Complete (send)
│   └── callback/route.ts   ✅ Complete (verify)
├── steam/
│   ├── route.ts            🔄 Partial (needs completion)
│   └── callback/route.ts   📋 Planned
├── discord/
│   ├── route.ts            📋 Planned
│   └── callback/route.ts   📋 Planned
├── google/
│   ├── route.ts            📋 Planned
│   └── callback/route.ts   📋 Planned
├── github/
│   ├── route.ts            📋 Planned
│   └── callback/route.ts   📋 Planned
└── apple/
    ├── route.ts            📋 Planned
    └── callback/route.ts   📋 Planned
```

---

## Database Migrations Required

```sql
-- Discord support
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS discord_id TEXT UNIQUE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS discord_username TEXT;
CREATE INDEX IF NOT EXISTS idx_profiles_discord_id ON public.profiles(discord_id) WHERE discord_id IS NOT NULL;

-- Provider tracking
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS auth_providers TEXT[] DEFAULT '{}';
-- Stores: ['email', 'steam', 'discord', 'google', etc.]

-- Alpha tester (may already exist)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_alpha_tester BOOLEAN DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_profiles_alpha_tester ON public.profiles(is_alpha_tester) WHERE is_alpha_tester = true;
```

---

## Environment Variables Required

```bash
# Existing
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_SITE_URL=

# Steam (add these)
STEAM_API_KEY=

# Discord (add these)
DISCORD_CLIENT_ID=
DISCORD_CLIENT_SECRET=

# Google (if not using Supabase's built-in)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# GitHub (if not using Supabase's built-in)
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

# Apple (if not using Supabase's built-in)
APPLE_CLIENT_ID=
APPLE_CLIENT_SECRET=
APPLE_TEAM_ID=
APPLE_KEY_ID=
```

---

## Testing Checklist

### For Each Provider:

- [ ] Initiate OAuth flow redirects correctly
- [ ] Callback handles success case
- [ ] Callback handles error case
- [ ] Session cookie set correctly
- [ ] Redirect to intended destination works
- [ ] New user: account created with correct data
- [ ] Existing user (same email): account linked
- [ ] Profile displays provider-specific data
- [ ] Account linking from profile settings works
- [ ] Unlinking provider works (if not last auth method)

### Security Tests:

- [ ] CSRF attacks blocked
- [ ] OAuth state parameter validated
- [ ] Rate limiting enforced
- [ ] Invalid tokens rejected
- [ ] Expired tokens rejected
- [ ] Session hijacking prevented

---

## Implementation Timeline (Suggested)

### Phase 1: Steam (Week 1-2)
- Complete Steam OAuth flow
- Test with real Steam accounts
- Account linking logic

### Phase 2: Discord (Week 3)
- Discord OAuth implementation
- Database migration
- Discord server integration (optional)

### Phase 3: Google & GitHub (Week 4)
- Leverage Supabase built-in providers
- Minimal custom code required

### Phase 4: Apple (Week 5+)
- Requires Apple Developer account
- More complex setup
- Lower priority

---

## Files Modified in This Update

1. `src/app/login/page.tsx` - Fixed redirect logic, added magic link
2. `src/app/alpha-testing/page.tsx` - Replaced stub with real API calls
3. `src/app/api/auth/signup/route.ts` - Fixed race condition, alpha tester marking
4. `src/app/api/auth/magic-link/route.ts` - NEW: Send magic link
5. `src/app/api/auth/magic-link/callback/route.ts` - NEW: Handle magic link callback
6. `src/app/api/alpha-testing/submit/route.ts` - Auto-mark alpha testers
7. `src/app/api/profile/route.ts` - Support is_alpha_tester field
8. `src/app/profile/page.tsx` - Display alpha tester badge
9. `src/lib/types.ts` - Added is_alpha_tester to Profile type
10. `supabase-schema.sql` - Added migration comment for is_alpha_tester

---

## Summary

The authentication system is now functional with:
- Email/password authentication
- Magic link (passwordless) authentication
- Proper redirect flow for alpha testing
- Alpha tester badge on profile

Next steps focus on implementing OAuth providers, starting with Steam as the highest priority for a gaming platform.
