# 🏆 Leaderboard Setup Guide

This guide will help you set up the leaderboard system with Supabase integration.

## Current Issue

**Error:** `Could not find the table 'public.player_scores' in the schema cache`

**Cause:** The `player_scores` table hasn't been created in your Supabase database yet.

## Quick Fix - Run the Migration

### Step 1: Access Supabase SQL Editor

1. Go to your Supabase project: https://app.supabase.com/project/osvrbwvxnbpwsmgvdmkm
2. Click on the **SQL Editor** in the left sidebar
3. Click **New Query**

### Step 2: Run the Migration

Copy and paste the contents of `supabase/migrations/create_player_scores_table.sql` into the SQL Editor and click **Run**.

Alternatively, you can run this command from your terminal if you have Supabase CLI installed:

```bash
npx supabase db push
```

### Step 3: Verify the Table Was Created

Run this query in the SQL Editor to verify:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name = 'player_scores';
```

You should see `player_scores` in the results.

### Step 4: Add Sample Data (Optional)

For testing, you can add sample leaderboard data. Run the seed data migration:

```bash
# Copy contents of supabase/migrations/seed_leaderboard_data.sql
# and run in SQL Editor
```

## Security Features Implemented

### ✅ Row Level Security (RLS)

The leaderboard system includes proper RLS policies:

1. **Public Read Access (Verified Scores Only)**
   - Anonymous users can view verified scores
   - Prevents unverified/cheated scores from appearing

2. **User Can View Own Unverified Scores**
   - Users can see their own pending scores
   - Useful for debugging and testing

3. **Authenticated Insert Only**
   - Only authenticated users can submit scores
   - Scores must belong to the authenticated user
   - Prevents score spoofing

### ✅ Data Validation

- Score must be >= 0 (no negative scores)
- Level must be > 0
- Mode restricted to: `speedrun`, `survival`, `discovery`, `boss_rush`, `global`
- Platform restricted to: `PC`, `Mac`, `Linux`, `PS`, `Xbox`, `Switch`

### ✅ Performance Optimization

Indexes created on:
- `user_id` (for user profile lookups)
- `submitted_at` DESC (for time-based leaderboards)
- `score` DESC (for score rankings)
- `mode` (for filtering by game mode)
- `is_verified` (partial index for verified scores only)

## API Security

### Leaderboard API (`/api/leaderboard`)

**Security measures:**
- Uses Supabase Service Role Key for server-side queries
- Filters only verified scores (`is_verified = true`)
- Implements pagination to prevent large data dumps
- Time-window filtering (today, 7d, 30d, 90d, all-time)

**Environment Variables Required:**
```env
NEXT_PUBLIC_SUPABASE_URL=https://osvrbwvxnbpwsmgvdmkm.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_key_here  # IMPORTANT: Keep this secret!
```

### Submit Score API (`/api/submit-score`)

Check if this route exists and implements:
- ✅ User authentication check
- ✅ Score validation
- ✅ Rate limiting (prevent spam submissions)
- ✅ Anti-cheat measures (scores marked as `is_verified: false` by default)

## Testing the Leaderboard

### 1. Visit the Leaderboard Page

```
http://localhost:3000/leaderboard
```

### 2. Check for Errors

Open browser console (F12) and check for:
- ✅ No 500 errors from `/api/leaderboard`
- ✅ Leaderboard data loads successfully
- ✅ Filters work (time period, mode, platform)

### 3. Test Score Submission (if implemented)

```typescript
// Example: Submitting a score from the game client
const response = await fetch('/api/submit-score', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    score: 12345,
    mode: 'speedrun',
    platform: 'PC',
    level: 10,
    time_seconds: 450,
  }),
});
```

## Verification System (Anti-Cheat)

Scores are submitted as `is_verified: false` by default. To verify scores:

### Manual Verification (Admin)

```sql
-- Mark a score as verified
UPDATE player_scores
SET is_verified = true
WHERE id = 'score-uuid-here';
```

### Automated Verification (Future Enhancement)

Consider implementing:
- Server-side validation (score must be achievable)
- Replay file verification
- Statistical analysis (flag outliers)
- Community reporting system

## Troubleshooting

### Issue: "Could not find the table 'public.player_scores'"

**Solution:** Run the migration in Step 2 above.

### Issue: "No scores showing up"

**Possible causes:**
1. No verified scores in database → Add seed data
2. Time window too restrictive → Try "All-Time" filter
3. RLS policies blocking access → Check Supabase logs

### Issue: "403 Forbidden" when submitting scores

**Possible causes:**
1. User not authenticated → Check `supabase.auth.getSession()`
2. Service role key missing → Add to `.env.local`
3. RLS policy blocking → Verify policies in SQL

## Next Steps

1. ✅ Run the migration to create the table
2. ✅ Add seed data for testing (optional)
3. 🔄 Test the leaderboard page
4. 🔄 Implement score submission from game client
5. 🔄 Add verification system for anti-cheat
6. 🔄 Monitor and optimize performance

## Support

- **Supabase Docs:** https://supabase.com/docs
- **Project Schema:** See `supabase-schema.sql`
- **Migration Files:** See `supabase/migrations/`

---

**Status:** Ready to deploy after running migrations ✨
