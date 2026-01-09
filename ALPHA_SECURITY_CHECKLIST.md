# 🛡️ Alpha Launch Security Checklist

## Pre-Launch Security Verification for ETU 2175

**Status:** Ready for Alpha Testing
**Last Updated:** 2026-01-09
**Security Level:** Production-Ready

---

## 🔐 1. Supabase Row Level Security (RLS)

### Critical: Enable RLS on ALL Tables

**Why:** RLS ensures users can only access data they're authorized to see. Without RLS, anyone with the publishable key can read/write any data.

#### Tables Requiring RLS:

- [ ] **`profiles`** - User profile data
  ```sql
  -- Enable RLS
  ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

  -- Policy: Users can read their own profile
  CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

  -- Policy: Users can update their own profile
  CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);
  ```

- [ ] **`player_scores`** - Leaderboard scores
  ```sql
  -- Enable RLS
  ALTER TABLE player_scores ENABLE ROW LEVEL SECURITY;

  -- Policy: Anyone can read scores (public leaderboard)
  CREATE POLICY "Anyone can view scores" ON player_scores
    FOR SELECT USING (true);

  -- Policy: Authenticated users can insert their own scores
  CREATE POLICY "Users can insert own scores" ON player_scores
    FOR INSERT WITH CHECK (auth.uid() = user_id);

  -- Policy: Users cannot update/delete scores (immutable)
  -- No UPDATE or DELETE policies = users can't modify scores
  ```

#### Verification Steps:

1. Go to Supabase Dashboard → Database → Tables
2. For each table, verify **"RLS enabled"** badge
3. Click table → **Policies** tab
4. Verify appropriate policies exist
5. Test with publishable key from browser console

---

## 🔑 2. API Key Security

### ✅ Publishable Key (`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY`)

- [ ] Configured in Vercel environment variables
- [ ] Used in client-side code (`supabaseClient.ts`)
- [ ] **Prefix:** `NEXT_PUBLIC_` (exposed to browser)
- [ ] **Value:** `sb_publishable_S-AUeHUK7G-LDgOPIs3v2g_1NAbdp6r`
- [ ] RLS enabled on all tables (required for safe use)

### 🔒 Secret Key (`SUPABASE_SECRET_KEY`)

- [ ] Configured in Vercel (server-only, no `NEXT_PUBLIC_` prefix)
- [ ] **NEVER** exposed to browser
- [ ] Only used in API routes and server components
- [ ] **Value:** `sb_secret_GawR71KhJNdFURr5srvhIg_IWgbH0wc`
- [ ] Browser check implemented (`typeof window !== 'undefined'` throws error)

### Browser Verification:

1. Open your site in browser
2. Open DevTools → Console
3. Run: `console.log(process.env)`
4. **Verify:** Secret key is **NOT** visible
5. **Verify:** Only `NEXT_PUBLIC_*` variables are visible

---

## 🔒 3. Authentication Security

### Auth Configuration Checklist:

- [ ] **Email verification** enabled (Settings → Auth → Email Auth)
- [ ] **Password requirements:**
  - [ ] Minimum length: 8 characters
  - [ ] Complexity: enforced
- [ ] **Rate limiting** enabled (prevent brute force)
- [ ] **Session duration** configured (default: 7 days)
- [ ] **Redirect URLs** whitelisted:
  - [ ] `https://exploretheuniverse2175.com/*`
  - [ ] `http://localhost:3000/*` (development)
  - [ ] Your Vercel preview URLs

### Test Auth Flow:

- [ ] Sign up with new email
- [ ] Receive verification email
- [ ] Verify email and complete signup
- [ ] Log out
- [ ] Log in with credentials
- [ ] Password reset flow works
- [ ] Steam OAuth works (if enabled)

---

## 🌐 4. CORS & Security Headers

### Verify Security Headers:

Check your site with: https://securityheaders.com

Required headers (already in `next.config.js`):

- [ ] **Strict-Transport-Security** (HSTS)
- [ ] **X-Frame-Options** (clickjacking protection)
- [ ] **X-Content-Type-Options** (MIME sniffing protection)
- [ ] **X-XSS-Protection**
- [ ] **Content-Security-Policy** (CSP)
- [ ] **Referrer-Policy**

### CORS Configuration:

- [ ] Supabase CORS allows your domain
- [ ] Check: Dashboard → Settings → API → **Additional redirect URLs**

---

## 🚨 5. Input Validation & Sanitization

### Critical Input Points:

- [ ] **Score submission** - Validate score ranges, prevent injection
- [ ] **Profile updates** - Sanitize username, bio, etc.
- [ ] **Leaderboard queries** - Parameterized queries only
- [ ] **Auth forms** - Email validation, password strength

### Anti-Cheat Measures:

- [ ] Score validation logic (reasonable ranges)
- [ ] Rate limiting on score submissions
- [ ] Server-side score verification
- [ ] Timestamp validation (prevent replay attacks)

---

## 📊 6. Database Security

### Table Permissions:

- [ ] Public tables have SELECT-only policies
- [ ] User data tables have user-specific policies
- [ ] No tables allow anonymous DELETE/UPDATE

### Backup & Recovery:

- [ ] Database backups enabled (Supabase automatic backups)
- [ ] Backup frequency: Daily
- [ ] Retention: 7 days (adjust as needed)

### Query Monitoring:

- [ ] Slow query monitoring enabled
- [ ] Query logs reviewed for suspicious activity

---

## 🔍 7. Monitoring & Logging

### Error Monitoring:

- [ ] Sentry or similar error tracking configured
- [ ] Critical errors alert via email/Slack
- [ ] Error logs reviewed regularly

### Usage Monitoring:

- [ ] Supabase Dashboard → Database → Usage
- [ ] Monitor:
  - [ ] API requests per day
  - [ ] Database size
  - [ ] Active users
  - [ ] Failed auth attempts

### Alerts Setup:

- [ ] High error rate alert
- [ ] Database quota warning (80% usage)
- [ ] Failed login attempt spike
- [ ] Unusual score submissions

---

## 🧪 8. Testing Before Launch

### Functional Testing:

- [ ] Sign up flow (new user)
- [ ] Login flow (existing user)
- [ ] Logout flow
- [ ] Password reset
- [ ] Profile update
- [ ] Score submission
- [ ] Leaderboard loading
- [ ] Steam auth (if enabled)

### Security Testing:

- [ ] **SQL Injection:** Try `' OR '1'='1` in inputs
- [ ] **XSS:** Try `<script>alert('xss')</script>` in profile fields
- [ ] **CSRF:** Verify CSRF tokens on forms
- [ ] **Unauthorized access:** Try accessing other users' data
- [ ] **Rate limiting:** Spam submit scores rapidly

### Performance Testing:

- [ ] Load leaderboard with 1000+ scores
- [ ] Simultaneous user logins (10+)
- [ ] Rapid score submissions
- [ ] Large profile data (long usernames/bios)

---

## 🚀 9. Deployment Security

### Vercel Configuration:

- [ ] Environment variables configured (Production, Preview, Development)
- [ ] **Secret key** only in Production & Preview (not Development)
- [ ] Deployment protection enabled (password/auth for previews)
- [ ] HTTPS enforced (automatic in Vercel)

### DNS & SSL:

- [ ] Custom domain configured
- [ ] SSL certificate active
- [ ] HTTPS redirect enabled
- [ ] HSTS header configured

---

## 📋 10. Alpha Launch Day Checklist

### Pre-Launch (1 hour before):

- [ ] Final deployment to production
- [ ] Verify all environment variables
- [ ] Test full user flow end-to-end
- [ ] Check error monitoring dashboard
- [ ] Verify Supabase dashboard (no anomalies)

### Launch:

- [ ] Announce to alpha testers
- [ ] Monitor error dashboard
- [ ] Watch Supabase usage metrics
- [ ] Be ready for rapid fixes

### Post-Launch (first 24 hours):

- [ ] Review error logs
- [ ] Check user feedback
- [ ] Monitor performance metrics
- [ ] Verify no security incidents
- [ ] Check for unusual database activity

---

## 🆘 Emergency Response Plan

### If Security Breach Detected:

1. **Immediately:**
   - [ ] Rotate all API keys in Supabase
   - [ ] Update keys in Vercel
   - [ ] Redeploy application
   - [ ] Lock down affected tables

2. **Within 1 hour:**
   - [ ] Assess scope of breach
   - [ ] Notify affected users (if user data exposed)
   - [ ] Document incident

3. **Within 24 hours:**
   - [ ] Implement fix
   - [ ] Re-test security
   - [ ] Update security measures

### Emergency Contacts:

- **Supabase Support:** https://supabase.com/support
- **Vercel Support:** https://vercel.com/support

---

## ✅ Final Security Sign-Off

Before launching alpha, confirm:

- [ ] I have verified RLS is enabled on ALL tables
- [ ] I have tested RLS policies work correctly
- [ ] I have confirmed secret key is NOT exposed in browser
- [ ] I have tested the complete user auth flow
- [ ] I have reviewed security headers
- [ ] I have set up error monitoring
- [ ] I have a backup plan if issues arise
- [ ] I understand the emergency response plan

**Signed:** ___________________
**Date:** ___________________

---

## 🎯 Alpha Success Metrics

Track these for first week:

- [ ] Zero security incidents
- [ ] < 1% error rate
- [ ] No unauthorized data access
- [ ] All auth flows working
- [ ] Positive user feedback on security/privacy

---

**🚀 You're ready for Alpha Launch!**

Good luck, Commander! May your alpha explorers have a secure and amazing experience! 🌌
