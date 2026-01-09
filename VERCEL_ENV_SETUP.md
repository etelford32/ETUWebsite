# Vercel Environment Variables Setup

## ⚠️ CRITICAL: Missing Environment Variables

The deployment is currently failing because the required Supabase environment variables are not set in Vercel.

## 🔧 Fix Required

Go to your Vercel Dashboard and add these environment variables:

### Navigate to:
`https://vercel.com/your-project/settings/environment-variables`

### Required Variables:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://osvrbwvxnbpwsmgvdmkm.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_actual_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_actual_service_role_key_here
STEAM_WEB_API_KEY=your_steam_api_key_here
NEXT_PUBLIC_SITE_URL=https://exploretheuniverse2175.com
```

### Where to find your Supabase keys:
1. Go to: https://supabase.com/dashboard
2. Select your project
3. Navigate to: Settings → API
4. Copy the values for:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - anon public → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - service_role → `SUPABASE_SERVICE_ROLE_KEY`

## 📝 Steps to Fix

1. **Go to Vercel Dashboard**
   - Visit: https://vercel.com
   - Select your project: `ETUWebsite`
   - Click "Settings" → "Environment Variables"

2. **Add each variable**
   - Click "Add New"
   - Enter the key name (e.g., `NEXT_PUBLIC_SUPABASE_URL`)
   - Enter the value
   - Select environments: Production, Preview, Development
   - Click "Save"

3. **Redeploy**
   - Go to "Deployments"
   - Click the three dots on the latest deployment
   - Click "Redeploy"

## ✅ Verify Setup

After adding the variables and redeploying, check:
- No error: "Missing environment variable: NEXT_PUBLIC_SUPABASE_URL"
- Auth pages work correctly
- Leaderboard loads data

## 🔐 Security Note

**NEVER commit these values to Git!**
- They are already in `.gitignore` via `.env.local`
- Only set them in Vercel dashboard
- Only share via secure channels
