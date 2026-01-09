# 🎮 Steam Integration Guide for Alpha Launch

## ⚠️ Steam API Keys Explained

You mentioned adding an "Encrypted App Ticket Key" - let me clarify the **two different types of Steam keys**:

### 1. **Encrypted App Ticket Key** (What you have)
- **Purpose:** Used in your **game client** to validate encrypted app tickets from Steamworks SDK
- **Use case:** Verify players own your game on Steam
- **Location:** Added to Steamworks Partner site → Your App → SDK Auth
- **Security:** Server-side only, used to decrypt tickets from game client
- **NOT the same as:** Steam Web API Key

### 2. **Steam Web API Key** (What you need for leaderboard/profiles)
- **Purpose:** Used to call Steam Web API from your **website backend**
- **Use case:** Fetch player profiles, avatars, friend lists, achievements, stats
- **How to get:**
  1. Go to: https://steamcommunity.com/dev/apikey
  2. Enter your domain: `exploretheuniverse2175.com`
  3. Agree to terms
  4. Copy the key (format: `XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX` - 32 hex characters)
- **Add to Vercel:** `STEAM_WEB_API_KEY=your_32_char_hex_key_here`

---

## 📋 Quick Setup: Get Steam Web API Key

### Step 1: Generate Key
1. Visit: https://steamcommunity.com/dev/apikey
2. Log in with your Steam account
3. Enter domain name: `exploretheuniverse2175.com`
4. Click "Register"
5. Copy the API key

### Step 2: Add to Vercel
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Edit existing `STEAM_WEB_API_KEY` variable
3. Replace the Encrypted App Ticket Key with the Web API Key
4. Select: Production, Preview, Development
5. Save and redeploy

### Step 3: Verify
```bash
# Test the key works
curl "https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=YOUR_KEY&steamids=76561197960435530"
```

You should get a JSON response with player data.

---

## 🏆 Steam Leaderboard Integration

### Current Status
✅ Steam OAuth authentication working
✅ Steam ID stored in profiles table
✅ Basic leaderboard displays scores
⚠️ Missing: Steam profile enrichment (avatars, usernames)
⚠️ Missing: Steam friends leaderboard
⚠️ Missing: Steam achievement integration

### What We Can Add Now (Alpha Launch)

#### 1. **Steam Profile Enrichment on Leaderboard**
Display Steam avatars and usernames next to scores:
- ✅ Fetch from Steam API when `steam_id` exists
- ✅ Cache in database for performance
- ✅ Fallback to username if no Steam profile

#### 2. **"Friends Only" Filter**
Show only scores from Steam friends:
- ✅ Fetch user's Steam friends list
- ✅ Filter leaderboard to show friends' scores
- ✅ Add "Friends" tab to leaderboard UI

#### 3. **Steam Platform Badge**
Show Steam logo for players who authenticated via Steam

---

## 🚀 Implementation Plan for Alpha

### Phase 1: Profile Enrichment (30 minutes)

**Update Leaderboard to show Steam profiles:**

1. **API Endpoint Enhancement**
   - Fetch Steam profiles for players with `steam_id`
   - Cache results in database
   - Return enriched data to frontend

2. **Frontend Display**
   - Show Steam avatars on leaderboard
   - Display Steam usernames
   - Add Steam badge/icon

### Phase 2: Friends Leaderboard (1 hour)

1. **Create Friends API**
   - Endpoint to fetch user's Steam friends
   - Filter leaderboard by friend Steam IDs

2. **UI Toggle**
   - Add "Show Friends Only" checkbox
   - "Global" vs "Friends" tabs

### Phase 3: Steam Stats Sync (Post-Alpha)

1. **Game Client Integration**
   - Upload scores to both Steam Leaderboards and ETU API
   - Track stats (kills, deaths, playtime)
   - Unlock Steam achievements

2. **Web Sync**
   - Periodic sync from Steam to Supabase
   - Display Steam achievements on profile
   - Show Steam stats on leaderboard

---

## 💻 Code: Steam Profile Enrichment

### Update API Endpoint

**File: `src/app/api/leaderboard/route.ts`**

Add this helper function:

```typescript
// Fetch Steam profiles for enrichment
async function enrichWithSteamProfiles(entries: LeaderboardEntry[]): Promise<LeaderboardEntry[]> {
  const steamApiKey = process.env.STEAM_WEB_API_KEY
  if (!steamApiKey) return entries

  // Collect all Steam IDs
  const steamIds = entries
    .map(e => e.profile?.steam_id)
    .filter(Boolean)

  if (steamIds.length === 0) return entries

  try {
    // Fetch Steam profiles in batch
    const steamResponse = await fetch(
      `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${steamApiKey}&steamids=${steamIds.join(',')}`
    )
    const steamData = await steamResponse.json()
    const steamProfiles = steamData.response?.players || []

    // Map Steam profiles by ID
    const steamMap = new Map(
      steamProfiles.map((p: any) => [p.steamid, p])
    )

    // Enrich entries with Steam data
    return entries.map(entry => {
      if (entry.profile?.steam_id) {
        const steamProfile = steamMap.get(entry.profile.steam_id)
        if (steamProfile) {
          return {
            ...entry,
            profile: {
              ...entry.profile,
              steam_username: steamProfile.personaname,
              steam_avatar: steamProfile.avatarfull || steamProfile.avatarmedium,
              steam_profile_url: steamProfile.profileurl,
            }
          }
        }
      }
      return entry
    })
  } catch (error) {
    console.error('Error fetching Steam profiles:', error)
    return entries // Return original data if Steam API fails
  }
}
```

Then call it before returning:

```typescript
// After fetching from database
const enrichedData = await enrichWithSteamProfiles(data)

return NextResponse.json({
  data: enrichedData,
  total,
  page: Number(page),
  pageSize: Number(pageSize)
})
```

---

## 🎨 Frontend: Display Steam Profiles

### Update Leaderboard Component

**File: `src/app/leaderboard/page.tsx`**

Add Steam avatar display:

```tsx
{/* Player Column */}
<div className="flex items-center gap-3">
  {/* Steam Avatar */}
  {entry.profile?.steam_avatar && (
    <img
      src={entry.profile.steam_avatar}
      alt={entry.profile.username}
      className="w-10 h-10 rounded-full border-2 border-cyan-500"
    />
  )}

  {/* Username */}
  <div>
    <div className="font-semibold flex items-center gap-2">
      {entry.profile?.steam_username || entry.profile?.username || 'Anonymous'}

      {/* Steam Badge */}
      {entry.profile?.steam_id && (
        <span
          className="text-xs bg-gray-700 px-2 py-0.5 rounded flex items-center gap-1"
          title="Steam Player"
        >
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
            {/* Steam logo SVG path */}
            <path d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V8.91c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.524 2.031 4.524 4.527s-2.03 4.525-4.524 4.525h-.105l-4.076 2.911c0 .052.004.105.004.159 0 1.875-1.515 3.396-3.39 3.396-1.635 0-3.016-1.173-3.331-2.727L.436 15.27C1.862 20.307 6.486 24 11.979 24c6.627 0 11.999-5.373 11.999-12S18.605 0 11.979 0zM7.54 18.21l-1.473-.61c.262.543.714.999 1.314 1.25 1.297.539 2.793-.091 3.332-1.414.263-.639.272-1.322.05-1.926-.224-.604-.667-1.075-1.247-1.315-.576-.239-1.209-.26-1.797-.12l1.514.63c.957.4 1.415 1.499 1.016 2.456-.398.957-1.497 1.419-2.454 1.021l-.255-.107zm11.415-9.303c0-1.662-1.353-3.015-3.015-3.015-1.665 0-3.015 1.353-3.015 3.015 0 1.665 1.35 3.015 3.015 3.015 1.663 0 3.015-1.35 3.015-3.015zm-5.273-.005c0-1.252 1.013-2.266 2.265-2.266 1.249 0 2.266 1.014 2.266 2.266 0 1.251-1.017 2.265-2.266 2.265-1.253 0-2.265-1.014-2.265-2.265z"/>
          </svg>
          Steam
        </span>
      )}
    </div>
    <div className="text-xs text-gray-400">{entry.profile?.faction_choice}</div>
  </div>
</div>
```

---

## 🎯 Steam Friends Leaderboard

### New API Endpoint

**File: `src/app/api/steam/friends/route.ts`** (NEW)

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabaseServer'

export async function GET(request: NextRequest) {
  const steamApiKey = process.env.STEAM_WEB_API_KEY

  if (!steamApiKey) {
    return NextResponse.json({ error: 'Steam API key not configured' }, { status: 500 })
  }

  // Get current user's Steam ID
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('steam_id')
    .eq('id', user.id)
    .single()

  if (!profile?.steam_id) {
    return NextResponse.json({ error: 'No Steam account linked' }, { status: 400 })
  }

  try {
    // Fetch friends list from Steam
    const friendsResponse = await fetch(
      `https://api.steampowered.com/ISteamUser/GetFriendList/v1/?key=${steamApiKey}&steamid=${profile.steam_id}&relationship=friend`
    )

    if (!friendsResponse.ok) {
      throw new Error('Failed to fetch Steam friends')
    }

    const friendsData = await friendsResponse.json()
    const friends = friendsData.friendslist?.friends || []

    // Get friend Steam IDs
    const friendSteamIds = friends.map((f: any) => f.steamid)

    // Fetch friend profiles
    if (friendSteamIds.length > 0) {
      const profilesResponse = await fetch(
        `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${steamApiKey}&steamids=${friendSteamIds.join(',')}`
      )
      const profilesData = await profilesResponse.json()
      const profiles = profilesData.response?.players || []

      return NextResponse.json({
        friends: profiles.map((p: any) => ({
          steam_id: p.steamid,
          username: p.personaname,
          avatar: p.avatarmedium,
        }))
      })
    }

    return NextResponse.json({ friends: [] })
  } catch (error) {
    console.error('Error fetching Steam friends:', error)
    return NextResponse.json({ error: 'Failed to fetch friends' }, { status: 500 })
  }
}
```

### Add Friends Toggle to Leaderboard

In `src/app/leaderboard/page.tsx`:

```tsx
const [showFriendsOnly, setShowFriendsOnly] = useState(false)
const [steamFriends, setSteamFriends] = useState<string[]>([])

// Fetch Steam friends
useEffect(() => {
  if (currentUser && showFriendsOnly) {
    fetchSteamFriends()
  }
}, [currentUser, showFriendsOnly])

async function fetchSteamFriends() {
  try {
    const res = await fetch('/api/steam/friends')
    const data = await res.json()
    if (data.friends) {
      setSteamFriends(data.friends.map(f => f.steam_id))
    }
  } catch (error) {
    console.error('Error fetching Steam friends:', error)
  }
}

// Filter entries by Steam friends
const filteredEntries = useMemo(() => {
  let filtered = entries

  // Friends filter
  if (showFriendsOnly && steamFriends.length > 0) {
    filtered = filtered.filter(entry =>
      entry.profile?.steam_id && steamFriends.includes(entry.profile.steam_id)
    )
  }

  // ... other filters ...

  return filtered
}, [entries, showFriendsOnly, steamFriends, /* other deps */])

// UI Toggle
<div className="flex items-center gap-2 mb-4">
  <input
    type="checkbox"
    id="friends-only"
    checked={showFriendsOnly}
    onChange={(e) => setShowFriendsOnly(e.target.checked)}
    disabled={!currentUser}
    className="w-4 h-4"
  />
  <label htmlFor="friends-only" className="text-sm">
    Show Steam Friends Only {!currentUser && '(Login required)'}
  </label>
</div>
```

---

## ✅ Alpha Launch Checklist

Before announcing alpha:

### Steam Setup
- [ ] Get Steam Web API Key from https://steamcommunity.com/dev/apikey
- [ ] Add to Vercel as `STEAM_WEB_API_KEY`
- [ ] Verify key works with test API call
- [ ] Redeploy application

### Test Steam Features
- [ ] Steam login works
- [ ] Steam avatars appear on leaderboard
- [ ] Steam usernames display correctly
- [ ] Steam badge shows for Steam players
- [ ] Friends leaderboard works (if implemented)

### Optional (Post-Alpha)
- [ ] Add Steam achievement system
- [ ] Sync stats from Steam
- [ ] Display Steam playtime
- [ ] Add Steam friend invites

---

## 🎮 For Your Game Client

When you're ready to integrate the game:

### Unity/Unreal
```csharp
// Submit score to both Steam and ETU
public async void SubmitScore(int score, string mode) {
    // 1. Submit to Steam Leaderboard
    SteamUserStats.UploadLeaderboardScore(
        leaderboardHandle,
        score,
        ELeaderboardUploadScoreMethod.KeepBest
    );

    // 2. Submit to ETU API
    var payload = new {
        user_id = GetUserId(),
        score = score,
        mode = mode,
        platform = "PC",
        steam_id = SteamUser.GetSteamID().ToString()
    };

    await PostToETUApi("/api/scores/submit", payload);
}
```

---

## 📞 Next Steps

1. **Get Steam Web API Key** (5 minutes)
2. **Add to Vercel** (2 minutes)
3. **I'll implement profile enrichment** (give me the go-ahead!)
4. **Test on alpha** (10 minutes)
5. **Announce to testers!** 🚀

---

**Ready to enhance your leaderboard with Steam profiles?** Let me know and I'll implement the code changes! 🎮
