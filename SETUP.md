# ETU 2175 - Next.js App Setup Guide

## 🚀 Quick Start

You now have a full Next.js application with Supabase integration! Here's how to get it running:

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Supabase Database

1. Go to your Supabase project: https://supabase.com/dashboard
2. Navigate to the SQL Editor
3. Copy and paste the contents of `supabase-schema.sql`
4. Execute the SQL script

This will create:
- `profiles` table (user profiles with Steam ID support)
- `player_scores` table (leaderboard data)
- Row Level Security policies
- Automatic profile creation on signup

### 3. Configure Environment Variables

Update `.env.local` with your actual values:

```bash
# Get these from: https://supabase.com/dashboard/project/YOUR_PROJECT/settings/api
NEXT_PUBLIC_SUPABASE_URL=https://osvrbwvxnbpwsmgvdmkm.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Get from: https://steamcommunity.com/dev/apikey
STEAM_WEB_API_KEY=your_steam_api_key_here

# Your production URL
NEXT_PUBLIC_SITE_URL=https://exploretheuniverse2175.com
```

### 4. Run Development Server

```bash
npm run dev
```

Visit http://localhost:3000

### 5. Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Add environment variables in Vercel dashboard
```

---

## 📁 Project Structure

```
ETUWebsite/
├── src/
│   ├── app/
│   │   ├── (public)/
│   │   │   ├── page.tsx          # Auth/Join page
│   │   │   └── join/page.tsx     # Alternative join page
│   │   ├── dashboard/
│   │   │   └── page.tsx          # User dashboard with leaderboard
│   │   ├── api/
│   │   │   ├── leaderboard/      # GET leaderboard data
│   │   │   ├── submit-score/     # POST score submission
│   │   │   ├── steam/auth/       # Steam OAuth flow
│   │   │   ├── steam/callback/   # Steam OAuth callback
│   │   │   └── auth/callback/    # Supabase auth callback
│   │   ├── layout.tsx            # Root layout
│   │   └── globals.css           # Global styles
│   ├── lib/
│   │   ├── supabaseClient.ts     # Supabase client
│   │   └── types.ts              # TypeScript types
│   └── input.css                 # Tailwind input
├── index.html                    # Static homepage (legacy)
├── supabase-schema.sql           # Database schema
├── next.config.js                # Next.js config
├── tsconfig.json                 # TypeScript config
└── .env.local                    # Environment variables
```

---

## 🎮 Game Client Integration

### Submitting Scores from Your Unity Game

```csharp
// Example C# code for Unity

using System.Net.Http;
using System.Text;
using Newtonsoft.Json;

public class ETULeaderboard
{
    private const string API_URL = "https://exploretheuniverse2175.com/api/submit-score";

    public async void SubmitScore(string userId, int score, string mode, string platform)
    {
        var payload = new
        {
            user_id = userId,
            score = score,
            mode = mode,  // "speedrun", "survival", etc.
            platform = platform,  // "PC", "Mac", "Linux"
            level = PlayerPrefs.GetInt("CurrentLevel", 1),
            time_seconds = (int)Time.time,
            auth_token = GetAuthToken(),  // Your game's auth token
            metadata = new
            {
                version = Application.version,
                build = Application.buildGUID
            }
        };

        using (var client = new HttpClient())
        {
            var content = new StringContent(
                JsonConvert.SerializeObject(payload),
                Encoding.UTF8,
                "application/json"
            );

            var response = await client.PostAsync(API_URL, content);

            if (response.IsSuccessStatusCode)
            {
                Debug.Log("Score submitted successfully!");
            }
        }
    }

    private string GetAuthToken()
    {
        // TODO: Implement your game's authentication
        // Options:
        // 1. Steam Auth Ticket
        // 2. Your own JWT token
        // 3. Supabase session token
        return "your_auth_token";
    }
}
```

### Fetching Leaderboard in Game

```csharp
public async void FetchLeaderboard()
{
    string url = "https://exploretheuniverse2175.com/api/leaderboard?window=30d&pageSize=100";

    using (var client = new HttpClient())
    {
        var response = await client.GetStringAsync(url);
        var leaderboard = JsonConvert.DeserializeObject<LeaderboardResponse>(response);

        // Display in your UI
        foreach (var entry in leaderboard.data)
        {
            Debug.Log($"#{entry.rank}: {entry.profile.username} - {entry.score}");
        }
    }
}
```

---

## 🔐 Steam Integration Setup

### 1. Get Steam API Key

1. Visit: https://steamcommunity.com/dev/apikey
2. Register your domain
3. Add key to `.env.local` as `STEAM_WEB_API_KEY`

### 2. Enable Steam OAuth in Your Auth Page

Add this button to your join page:

```tsx
<a
  href="/api/steam/auth"
  className="w-full border rounded py-2 bg-slate-800 hover:bg-slate-700 flex items-center justify-center gap-2"
>
  <svg className="w-5 h-5" /* Steam icon SVG */></svg>
  Sign in with Steam
</a>
```

### 3. Link Steam Accounts

Users can link their Steam account to their existing profile in the dashboard.

---

## 📊 API Endpoints

### GET /api/leaderboard

Query parameters:
- `window`: 'today' | '7d' | '30d' | '90d' | 'all' (default: '30d')
- `mode`: Filter by game mode (optional)
- `page`: Page number (default: 1)
- `pageSize`: Items per page (default: 50, max: 100)
- `sortField`: Field to sort by (default: 'score')
- `sortDir`: 'asc' | 'desc' (default: 'desc')

Response:
```json
{
  "data": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "score": 123456,
      "mode": "speedrun",
      "platform": "PC",
      "level": 25,
      "submitted_at": "2025-12-05T...",
      "rank": 1,
      "profile": {
        "username": "Commander",
        "avatar_url": "https://...",
        "faction_choice": "crystal"
      }
    }
  ],
  "total": 1000,
  "page": 1,
  "pageSize": 50
}
```

### POST /api/submit-score

Request body:
```json
{
  "user_id": "uuid",
  "score": 123456,
  "mode": "speedrun",
  "platform": "PC",
  "level": 25,
  "time_seconds": 300,
  "auth_token": "your_auth_token",
  "metadata": {
    "version": "1.0.0"
  }
}
```

Response:
```json
{
  "success": true,
  "score": { /* created score object */ }
}
```

---

## 🚦 Next Steps

### Immediate (Before Launch - Dec 25th):

1. ✅ Run `npm install` to install all dependencies
2. ✅ Execute `supabase-schema.sql` in Supabase
3. ✅ Update `.env.local` with real API keys
4. ✅ Test authentication flow (signup, login, Steam)
5. ✅ Deploy to Vercel
6. ✅ Integrate score submission from your game
7. ✅ Test full flow: Game → Score submit → Shows on website

### Short-term (Post-Launch):

1. Add proper Steam authentication (full OAuth flow)
2. Implement anti-cheat validation for scores
3. Add user profile editing (change username, avatar, faction)
4. Create admin panel for score moderation
5. Add real-time leaderboard updates (WebSocket)

### Long-term (Roadmap):

1. Friend system (follow other players)
2. Achievements and badges
3. Seasonal leaderboards and events
4. Guild/clan system
5. In-game challenges visible on website

---

## 🛠️ Troubleshooting

### "Module not found: Can't resolve '@/lib/supabaseClient'"

Run: `npm install`

### "Supabase client error"

Check your `.env.local` values and make sure they match your Supabase project.

### "Failed to fetch leaderboard"

Make sure you've run the SQL schema in Supabase and the tables exist.

### Static HTML vs Next.js App

Currently, your static `index.html` is what Vercel serves at `/`. To use the Next.js app:

**Option A:** Keep both (recommended for transition)
- Static site at `/` (current homepage)
- App at `/dashboard`, `/join`
- Gradually migrate sections

**Option B:** Replace static with Next.js (later)
- Convert `index.html` to Next.js components
- Remove static files
- Full app architecture

---

## 📞 Support

Questions? Check:
- Supabase Docs: https://supabase.com/docs
- Next.js Docs: https://nextjs.org/docs
- Steam Web API: https://steamcommunity.com/dev

---

**Good luck with your launch on December 25th! 🚀🎄**

Let me know if you need any clarification or run into issues.
