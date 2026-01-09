# Zero-Client-Exposure Migration Status

## ✅ Completed (Core Functionality)

### Infrastructure
- [x] Environment variables (server-only)
- [x] Session management (HTTP-only cookies)
- [x] Middleware for route protection
- [x] Auth API routes (login, signup, session, logout)
- [x] Profile API routes (get, update)

### Pages Migrated
- [x] `/login` - Email/password auth via API
- [x] `/dashboard` - Session check via API
- [x] `/profile` - Profile CRUD via API

### Configuration
- [x] Disabled `supabaseClient.ts` (throws error on use)
- [x] Updated `supabaseServer.ts` (uses server-only env vars)
- [x] Excluded `archive/` from TypeScript build

---

## 🚧 In Progress / TODO

### Critical Pages (Blocking Features)

#### 1. `/app/feedback/page.tsx` ⚠️ HIGH PRIORITY
**Status**: Uses `supabaseClient` directly
**Functionality**: User feedback submission and voting
**Migration needed**:
- [ ] Create `/api/feedback/submit` route
- [ ] Create `/api/feedback/list` route
- [ ] Update page to use fetch() instead of supabaseClient

#### 2. `/app/backlog/page.tsx` ⚠️ HIGH PRIORITY
**Status**: Uses `supabaseClient` directly
**Functionality**: Feature request submission and voting
**Migration needed**:
- [ ] Create `/api/backlog/list` route
- [ ] Create `/api/backlog/create` route
- [ ] Update page to use fetch() instead of supabaseClient

#### 3. `/app/ship-designer/page.tsx` ⚠️ MEDIUM PRIORITY
**Status**: Uses `supabaseClient` directly
**Functionality**: Ship design save/load
**Migration needed**:
- [ ] Create `/api/ship-designer/save` route
- [ ] Create `/api/ship-designer/load` route
- [ ] Update page to use fetch() instead of supabaseClient

#### 4. `/app/alpha-testing/page.tsx` ⚠️ MEDIUM PRIORITY
**Status**: Uses `supabaseClient` directly
**Functionality**: Alpha testing signup
**Migration needed**:
- [ ] Already has `/api/alpha-testing/submit` route
- [ ] Update page to use API instead of direct Supabase

#### 5. `/app/leaderboard/page.tsx` ⚠️ LOW PRIORITY
**Status**: Uses `supabaseClient` for session check only
**Functionality**: Public leaderboard (already has API)
**Migration needed**:
- [ ] Replace `supabase.auth.getSession()` with `/api/auth/session`
- [ ] No other changes needed (already uses `/api/leaderboard`)

### Admin Pages ⚠️ HIGH PRIORITY (Security Sensitive)

#### `/app/admin/page.tsx`
- [ ] Replace session checks with `/api/auth/session`
- [ ] Create `/api/admin/stats` for dashboard stats

#### `/app/admin/feedback/page.tsx`
- [ ] Create `/api/admin/feedback/list` route
- [ ] Create `/api/admin/feedback/update` route
- [ ] Update page to use fetch()

#### `/app/admin/users/page.tsx`
- [ ] Create `/api/admin/users/list` route
- [ ] Create `/api/admin/users/update` route
- [ ] Update page to use fetch()

#### `/app/admin/analytics/page.tsx`
- [ ] Create `/api/admin/analytics` route
- [ ] Update page to use fetch()

#### `/app/admin/security/page.tsx`
- [ ] Create `/api/admin/security` route
- [ ] Update page to use fetch()

### Components

#### `/components/SteamProfileLink.tsx` ⚠️ LOW PRIORITY
- [ ] Replace session check with `/api/auth/session`

#### `/components/FOMOCounter.tsx` ⚠️ LOW PRIORITY
- [ ] Replace Supabase query with API route
- [ ] Create `/api/stats/users` if needed

#### `/components/RealSignupStats.tsx` ⚠️ LOW PRIORITY
- [ ] Replace Supabase query with API route
- [ ] Create `/api/stats/signups` if needed

---

## 🔧 API Routes Still Needed

### Feedback System
- [ ] `POST /api/feedback/submit` - Submit feedback
- [ ] `GET /api/feedback/list` - List feedback items
- [ ] `POST /api/feedback/vote` - Vote on feedback (already exists?)
- [ ] `PATCH /api/admin/feedback/update` - Update feedback status (admin)

### Backlog System
- [ ] `GET /api/backlog/list` - List backlog items
- [ ] `POST /api/backlog/create` - Create backlog item
- [ ] `POST /api/backlog/vote` - Vote on backlog (already exists?)
- [ ] `PATCH /api/admin/backlog/update` - Update backlog (admin)

### Ship Designer
- [ ] `POST /api/ship-designer/save` - Save ship design
- [ ] `GET /api/ship-designer/load` - Load user's ship designs

### Admin
- [ ] `GET /api/admin/stats` - Dashboard statistics
- [ ] `GET /api/admin/users/list` - List all users
- [ ] `PATCH /api/admin/users/update` - Update user roles
- [ ] `GET /api/admin/analytics` - Analytics data
- [ ] `GET /api/admin/security` - Security audit data

### Stats (Public)
- [ ] `GET /api/stats/users` - User count for FOMO counter
- [ ] `GET /api/stats/signups` - Signup stats

---

## 📋 Testing Checklist

### Core Auth Flow
- [ ] Signup creates account
- [ ] Login works with email/password
- [ ] Session persists across page reloads
- [ ] Logout clears session
- [ ] Protected routes redirect to /login
- [ ] Middleware blocks unauthenticated access

### Profile Management
- [ ] Can view own profile
- [ ] Can update username
- [ ] Can update faction choice
- [ ] Changes persist to database

### Existing API Routes (Should Still Work)
- [ ] `/api/leaderboard` - Public leaderboard
- [ ] `/api/submit-score` - Score submission
- [ ] `/api/steam/auth` - Steam OAuth
- [ ] `/api/steam/callback` - Steam callback

---

## 🚀 Deployment Checklist

### Vercel Environment Variables
Set these in Vercel Dashboard (NO NEXT_PUBLIC_ prefix except for site URL):

```bash
# Supabase (SERVER-ONLY)
SUPABASE_URL=https://osvrbwvxnbpwsmgvdmkm.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<your-actual-service-role-key>

# Session Security
SESSION_SECRET=<generate-random-32-char-string>

# Steam
STEAM_WEB_API_KEY=<your-steam-key>

# Site Config (This one CAN be NEXT_PUBLIC)
NEXT_PUBLIC_SITE_URL=https://exploretheuniverse2175.com
```

### Build Verification
- [ ] `npm run build` succeeds
- [ ] No TypeScript errors
- [ ] No console warnings about missing env vars
- [ ] Archive directory excluded from build

### Security Verification
- [ ] Browser DevTools → Application → Cookies shows `etu_session` as HttpOnly
- [ ] No Supabase keys visible in browser bundle
- [ ] Network tab shows API calls (not direct Supabase)
- [ ] Middleware redirects work correctly

---

## 📊 Migration Priority

**Phase 1 (Critical - Do First):**
1. Fix build errors (tsconfig.json) ✅ DONE
2. Leaderboard page (easy win)
3. Admin pages (security sensitive)

**Phase 2 (High Priority):**
4. Feedback system
5. Backlog system

**Phase 3 (Medium Priority):**
6. Ship designer
7. Alpha testing page

**Phase 4 (Low Priority - Polish):**
8. Components (stats, FOMO counter)
9. OAuth providers (Google, GitHub, Apple)
10. Magic link authentication

---

## 🐛 Known Issues

1. **OAuth providers disabled** - Google, GitHub, Apple login show error message
2. **Magic link disabled** - Shows error message
3. **Pages not yet migrated** - Will throw error when accessed
4. **Some API routes missing** - Feedback/backlog need new routes

These are INTENTIONAL to prevent insecure usage until migration is complete.

---

## 📝 Notes

- Steam OAuth still works (was already server-side)
- Leaderboard API still works (was already server-side)
- All errors are intentional to prevent accidental client-side Supabase usage
- Migration can be done incrementally - one page at a time
