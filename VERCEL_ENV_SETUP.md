# Vercel Environment Variables Setup

## ⚠️ CRITICAL: Required Environment Variables for Alpha Launch

The deployment requires properly configured Supabase environment variables using the **NEW API key format**.

> **Note:** Supabase has deprecated the old `anon_key` and `service_role_key` system. We now use **Publishable Keys** and **Secret Keys**.

---

## 🔑 Environment Variables Required

### Navigate to:
`https://vercel.com/your-project/settings/environment-variables`

### Required Variables:

```bash
# Supabase Project URL
NEXT_PUBLIC_SUPABASE_URL=https://osvrbwvxnbpwsmgvdmkm.supabase.co

# Publishable Key (safe for browser use with RLS enabled)
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=sb_publishable_S-AUeHUK7G-LDgOPIs3v2g_1NAbdp6r

# Secret Key (server-side only - NEVER expose to browser!)
SUPABASE_SECRET_KEY=sb_secret_GawR71KhJNdFURr5srvhIg_IWgbH0wc

# Steam API (optional - for Steam authentication)
STEAM_WEB_API_KEY=your_steam_api_key_here

# Your production URL
NEXT_PUBLIC_SITE_URL=https://exploretheuniverse2175.com
```

---

## 📍 Where to Find Your Supabase Keys

### Option 1: Supabase Dashboard (Recommended)

1. Go to: https://supabase.com/dashboard
2. Select your project: `osvrbwvxnbpwsmgvdmkm`
3. Navigate to: **Settings** → **API**
4. Copy the values:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **Publishable key** (starts with `sb_publishable_`) → `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY`
   - **Secret key** (starts with `sb_secret_`) → `SUPABASE_SECRET_KEY`

### Option 2: Using Values Above

The values shown above are your actual keys and are ready to use.

---

## 🛡️ Security Requirements

### ✅ **Publishable Key** (`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY`)
- **Safe for browser use** ✓
- **Requires Row Level Security (RLS)** enabled on all tables
- Used in client-side code
- Respects RLS policies
- Prefix: `NEXT_PUBLIC_` means it's exposed to the browser

### 🔒 **Secret Key** (`SUPABASE_SECRET_KEY`)
- **NEVER expose to browser** ⚠️
- **Server-side only** (API routes, server components)
- Bypasses RLS policies
- Has privileged access to database
- No `NEXT_PUBLIC_` prefix = server-only

---

## 📝 Steps to Configure in Vercel

### 1. Go to Vercel Dashboard
- Visit: https://vercel.com
- Select your project: `ETUWebsite`
- Click **Settings** → **Environment Variables**

### 2. Add Each Variable

For each variable above:

1. Click **"Add New"**
2. Enter the **Key** (e.g., `NEXT_PUBLIC_SUPABASE_URL`)
3. Enter the **Value** (the actual key/URL)
4. Select environments: ✅ **Production**, ✅ **Preview**, ✅ **Development**
5. Click **"Save"**

### 3. Redeploy

After adding all variables:

1. Go to **"Deployments"**
2. Click the **three dots** (•••) on the latest deployment
3. Click **"Redeploy"**
4. Wait for deployment to complete

---

## ✅ Verify Setup

After redeployment, check:

### ✅ No Errors
- [ ] No "Missing environment variable" errors in console
- [ ] No "NEXT_PUBLIC_SUPABASE_URL" error
- [ ] No "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY" error

### ✅ Functionality Works
- [ ] Auth pages load correctly
- [ ] Users can sign up/login
- [ ] Leaderboard displays data
- [ ] No CORS errors

### ✅ Security Checks
- [ ] Secret key is NOT visible in browser DevTools
- [ ] Client-side code only uses publishable key
- [ ] RLS policies are enabled on all tables

---

## 🔐 Security Best Practices

### ✅ DO:
- ✅ Use publishable key for all client-side operations
- ✅ Enable RLS on ALL database tables
- ✅ Configure RLS policies for each table
- ✅ Use secret key ONLY in API routes/server components
- ✅ Keep secret key in Vercel environment variables
- ✅ Use `.env.local` for local development (gitignored)

### ❌ DON'T:
- ❌ Never commit secrets to Git
- ❌ Never use secret key in client-side code
- ❌ Never expose secret key in browser
- ❌ Never disable RLS in production
- ❌ Never hardcode API keys in source code

---

## 🚨 Emergency: If Keys Are Compromised

If you accidentally expose your secret key:

1. **Immediately rotate keys** in Supabase Dashboard
2. Go to: Settings → API → **"Reset secret key"**
3. Update the new key in Vercel environment variables
4. Redeploy immediately

---

## 📞 Troubleshooting

### Error: "Missing environment variable: NEXT_PUBLIC_SUPABASE_URL"
**Solution:** Add `NEXT_PUBLIC_SUPABASE_URL` in Vercel environment variables and redeploy

### Error: "Missing environment variable: NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY"
**Solution:** Add the publishable key in Vercel and redeploy

### Error: "SECURITY ERROR: Server client cannot be used in browser context!"
**Solution:** You're using `createServerClient()` in client-side code. Use `supabase` from `supabaseClient.ts` instead

### Auth/Database Issues
**Solution:** Verify:
1. RLS is enabled on tables
2. RLS policies are configured
3. Publishable key is correct
4. URL is correct

---

## 🎯 Alpha Launch Checklist

Before going live with alpha:

- [ ] All environment variables configured in Vercel
- [ ] Successful deployment with no errors
- [ ] RLS enabled on all tables (see ALPHA_SECURITY_CHECKLIST.md)
- [ ] RLS policies tested and working
- [ ] Auth flow tested (signup, login, logout)
- [ ] Leaderboard tested and loading
- [ ] No secrets exposed in browser DevTools
- [ ] Error monitoring enabled

---

**Ready for Alpha Launch! 🚀**

See `ALPHA_SECURITY_CHECKLIST.md` for comprehensive security verification steps.
