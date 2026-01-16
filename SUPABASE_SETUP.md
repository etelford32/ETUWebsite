# Supabase Setup & Integration Guide

This guide documents the complete Supabase setup for the ETU 2175 website, including authentication, database schema, and form integrations.

## Table of Contents
1. [Database Setup](#database-setup)
2. [Authentication Flow](#authentication-flow)
3. [Form Integrations](#form-integrations)
4. [API Endpoints](#api-endpoints)
5. [Environment Variables](#environment-variables)
6. [Next Steps & TODOs](#next-steps--todos)

---

## Database Setup

### Required Migrations

Run these SQL migrations in your Supabase SQL Editor in order:

#### 1. Main Schema (`supabase-schema.sql`)
This creates the core tables for the game:
- `profiles` - User profiles (extends auth.users)
- `player_scores` - Game scores and leaderboard
- `ship_designs` - Ship designer data
- `backlog_items` - Feature requests and bug reports
- `backlog_votes` - Community voting system

**Run this first:**
```bash
# In Supabase SQL Editor, paste the contents of:
./supabase-schema.sql
```

#### 2. Forms Migration (`supabase-forms-migration.sql`)
This creates tables for website forms:
- `career_applications` - Job applications
- `investor_inquiries` - Investment inquiries

**Run this second:**
```bash
# In Supabase SQL Editor, paste the contents of:
./supabase-forms-migration.sql
```

### Database Schema Overview

```
auth.users (Supabase built-in)
    ↓ (trigger creates profile)
profiles
    ├── player_scores (user's game scores)
    ├── ship_designs (user's ship designs)
    ├── backlog_items (user's feature requests)
    └── backlog_votes (user's votes)

career_applications (standalone, no auth required)
investor_inquiries (standalone, no auth required)
```

---

## Authentication Flow

### Supported Authentication Methods

1. **Email/Password**
   - Sign up with email confirmation
   - Login with email/password
   - Automatic profile creation via trigger

2. **Magic Link (Passwordless)**
   - Send OTP link to email
   - One-click authentication

3. **OAuth Providers**
   - Google
   - GitHub
   - Apple

4. **Steam OpenID**
   - Custom integration for Steam authentication
   - Links Steam ID to existing profile

### Authentication Flow Diagram

```
User → /login
  ├── Email/Password → supabase.auth.signUp/signInWithPassword
  ├── Magic Link → supabase.auth.signInWithOtp
  ├── OAuth (Google/GitHub/Apple) → supabase.auth.signInWithOAuth
  └── Steam → /api/steam/auth → Steam OpenID → /api/steam/callback
       ↓
/api/auth/callback (OAuth/Magic Link only)
       ↓
/dashboard (authenticated user)
```

### Key Files

- **Login Page**: `src/app/login/page.tsx`
  - Handles all authentication methods
  - Client-side form validation
  - Redirects to dashboard on success

- **Auth Callback**: `src/app/api/auth/callback/route.ts`
  - Handles OAuth and Magic Link callbacks
  - Exchanges code for session
  - Redirects to dashboard

- **Steam Auth**: `src/app/api/steam/auth` & `src/app/api/steam/callback`
  - Custom Steam OpenID implementation
  - Creates/updates profile with Steam data
  - Currently doesn't create web session (TODO)

- **Supabase Client**: `src/lib/supabaseClient.ts`
  - Client initialization
  - Used throughout the app for auth and data

---

## Form Integrations

### Career Applications

**Frontend**: `src/app/careers/page.tsx`
**API**: `src/app/api/careers/route.ts`
**Table**: `career_applications`

**Fields**:
- `name` (required)
- `email` (required, validated)
- `position` (required, enum)
- `portfolio` (optional URL)
- `message` (required, min 20 chars)
- `resume_url` (TODO: file upload)

**Status Flow**: `pending` → `reviewing` → `interviewed` → `accepted`/`rejected`

**Submission Process**:
1. User fills out form on `/careers`
2. Form validates client-side
3. POST to `/api/careers`
4. API validates and inserts into database
5. Success confirmation screen shown

**TODO**:
- [ ] Implement resume file upload to Supabase Storage
- [ ] Add email notification to admin on new submission
- [ ] Add confirmation email to applicant

### Investor Inquiries

**Frontend**: `src/app/investors/page.tsx`
**API**: `src/app/api/investors/route.ts`
**Table**: `investor_inquiries`

**Fields**:
- `name` (required)
- `email` (required, validated)
- `phone` (required, min 10 chars)
- `company` (optional)
- `investment_range` (required, enum)
- `message` (required, min 20 chars)

**Status Flow**: `pending` → `contacted` → `meeting_scheduled` → `interested`/`not_interested`

**Submission Process**:
1. User fills out form on `/investors`
2. Form validates client-side
3. POST to `/api/investors`
4. API validates and inserts into database
5. Success confirmation screen shown

**TODO**:
- [ ] Add email notification to admin on new submission
- [ ] Add confirmation email to investor
- [ ] Add calendar integration for meeting scheduling

---

## API Endpoints

### Authentication

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/callback` | GET | OAuth/Magic Link callback handler |
| `/api/steam/auth` | GET | Initiates Steam OpenID flow |
| `/api/steam/callback` | GET | Handles Steam authentication callback |

### Game Data

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/leaderboard` | GET | Fetches player scores with pagination |
| `/api/submit-score` | POST | Submit new game score |
| `/api/backlog` | GET/POST | Feature requests and bug reports |
| `/api/backlog/vote` | POST | Vote on backlog items |
| `/api/save-ship` | POST | Save ship design |

### Forms

| Endpoint | Method | Description | Auth Required |
|----------|--------|-------------|---------------|
| `/api/careers` | POST | Submit career application | No |
| `/api/careers` | GET | List applications (admin) | Yes (API key) |
| `/api/investors` | POST | Submit investor inquiry | No |
| `/api/investors` | GET | List inquiries (admin) | Yes (API key) |

### Admin API Access

Admin endpoints require an API key in the `x-api-key` header:

```bash
curl -H "x-api-key: YOUR_ADMIN_API_KEY" \
  "https://yoursite.com/api/careers?status=pending&limit=50"
```

Set `ADMIN_API_KEY` in your environment variables.

---

## Environment Variables

### Required Environment Variables

Create a `.env.local` file in the project root:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://osvrbwvxnbpwsmgvdmkm.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here

# Service Role Key (for admin operations, keep secret!)
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Admin API Key (for accessing admin endpoints)
ADMIN_API_KEY=your_random_secret_key_here

# Steam OpenID (if using Steam auth)
STEAM_API_KEY=your_steam_api_key_here
```

### Getting Your Keys

1. **Supabase Keys**:
   - Go to Supabase Dashboard → Settings → API
   - Copy `URL`, `anon public`, and `service_role` keys

2. **Admin API Key**:
   - Generate a secure random string
   - Can use: `openssl rand -hex 32`

3. **Steam API Key**:
   - Get from: https://steamcommunity.com/dev/apikey

### Security Notes

⚠️ **IMPORTANT**:
- Never commit `.env.local` to git
- Service role key should ONLY be used in API routes (server-side)
- Anon key is safe for client-side use (it's restricted by RLS policies)
- Admin API key is a simple protection; consider OAuth for production

---

## Next Steps & TODOs

### High Priority

- [ ] **Run Database Migrations**
  - Execute `supabase-schema.sql` in Supabase SQL Editor
  - Execute `supabase-forms-migration.sql` in Supabase SQL Editor

- [ ] **Configure Environment Variables**
  - Create `.env.local` with all required keys
  - Update Vercel/hosting environment variables

- [ ] **Test Authentication Flow**
  - Test email/password signup and login
  - Test OAuth providers (Google, GitHub, Apple)
  - Test magic link authentication
  - Verify profile creation

- [ ] **Test Form Submissions**
  - Submit a test career application
  - Submit a test investor inquiry
  - Verify data in Supabase dashboard

### File Upload Implementation

The resume upload feature needs implementation:

1. **Enable Supabase Storage**:
   ```bash
   # In Supabase Dashboard:
   # Storage → Create bucket → "resumes"
   # Set bucket to private
   ```

2. **Update Career Form**:
   ```typescript
   // In src/app/careers/page.tsx
   // 1. Upload file to Supabase Storage
   const { data: uploadData, error: uploadError } = await supabase
     .storage
     .from('resumes')
     .upload(`${Date.now()}_${file.name}`, file)

   // 2. Get public URL
   const { data: { publicUrl } } = supabase
     .storage
     .from('resumes')
     .getPublicUrl(uploadData.path)

   // 3. Submit form with resume_url
   ```

3. **Update RLS Policies**:
   ```sql
   -- Allow anyone to upload to resumes bucket
   CREATE POLICY "Anyone can upload resumes"
   ON storage.objects FOR INSERT
   WITH CHECK (bucket_id = 'resumes');

   -- Only service role can read/download
   CREATE POLICY "Service role can access resumes"
   ON storage.objects FOR SELECT
   TO service_role
   USING (bucket_id = 'resumes');
   ```

### Email Notifications

Set up email notifications for form submissions:

1. **Option A: Supabase Edge Functions**
   ```typescript
   // Create edge function to send emails via SendGrid/Resend
   // Trigger on INSERT to career_applications/investor_inquiries
   ```

2. **Option B: Webhook**
   ```typescript
   // In API routes, after successful insert:
   await fetch('https://hooks.slack.com/...', {
     method: 'POST',
     body: JSON.stringify({ text: 'New application received!' })
   })
   ```

### Steam Authentication Fix

The Steam callback creates profiles but doesn't establish web sessions:

```typescript
// In src/app/api/steam/callback/route.ts
// After profile creation, establish session:
const { data, error } = await supabase.auth.signInWithPassword({
  email: `${steamId}@steam.local`, // or use magic link
  password: generatedPassword
})
```

Consider using a different approach or magic links for Steam users.

### Production Checklist

- [ ] Move hardcoded secrets to environment variables
- [ ] Set up proper error logging (Sentry, LogRocket)
- [ ] Add rate limiting to API endpoints
- [ ] Set up monitoring for form submissions
- [ ] Add CAPTCHA to forms (prevent spam)
- [ ] Set up automated backups
- [ ] Configure email service for notifications
- [ ] Add admin dashboard for managing applications/inquiries
- [ ] Set up analytics for form conversion tracking
- [ ] Add automated testing for auth and form flows

---

## TypeScript Types

All database types are defined in `src/lib/types.ts`:

```typescript
import { CareerApplication, InvestorInquiry } from '@/lib/types'

// Use throughout the app for type safety
```

---

## Support

For questions or issues:
- Check Supabase logs: Dashboard → Logs → Postgres/Auth
- Review browser console for client-side errors
- Check API route logs in deployment platform
- Supabase Discord: https://discord.supabase.com

---

**Last Updated**: January 2026
**Maintained By**: Telford Projects
