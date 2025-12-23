# Steam Integration Assessment for ETU 2175

## Overview
This document outlines the capabilities and requirements for integrating Steam features with the ETU 2175 player profile and scoring system.

---

## 1. Steam Leaderboards

### Capabilities
Steam provides built-in leaderboard functionality that can sync with our scoring system:

- **Global Leaderboards**: Rank all players worldwide by score
- **Friends Leaderboards**: Compare scores with Steam friends
- **Around User**: Show rankings around the current player
- **Time Windows**: Daily, weekly, monthly, all-time leaderboards
- **Multiple Leaderboards**: One per game mode (Any% Run, Boss Rush, Discovery, etc.)

### Integration Points
```javascript
// Game uploads score to Steam
SteamUserStats.UploadLeaderboardScore(
  leaderboardId,
  score,
  method: ELeaderboardUploadScoreMethod // KeepBest or ForceUpdate
)

// Game also sends to our API
fetch('/api/scores/submit', {
  score,
  mode,
  platform: 'steam',
  steam_id: user.steam_id
})
```

### Current Setup
- ✅ `steam_id` field in profiles table
- ✅ Steam authentication via OAuth
- ✅ `/api/steam/auth` endpoint
- ⚠️ Need: Steam API integration in game client
- ⚠️ Need: Webhook to sync Steam leaderboards to our DB

---

## 2. Steam Stats & Achievements

### Steam Stats (Int32/Float)
Steam can track persistent player statistics:

**Recommended Stats to Track:**
```
- total_playtime_seconds (INT)
- total_kills (INT)
- total_deaths (INT)
- total_wins (INT)
- total_losses (INT)
- highest_score (INT)
- total_distance_traveled (FLOAT)
- bosses_defeated (INT)
- systems_discovered (INT)
```

**Benefits:**
- Automatically syncs across Steam Cloud
- Persists even if player reinstalls
- Can trigger achievements
- Visible in Steam profile

### Steam Achievements
Unlock conditions based on stats or specific events:

**Example Achievements:**
```json
{
  "FIRST_BLOOD": {
    "name": "First Blood",
    "description": "Destroy your first enemy ship",
    "condition": "total_kills >= 1"
  },
  "ACE_PILOT": {
    "name": "Ace Pilot",
    "description": "Win 10 consecutive battles",
    "condition": "Check win streak in game"
  },
  "MEGABOT_SLAYER": {
    "name": "MEGABOT Slayer",
    "description": "Defeat the MEGABOT boss",
    "condition": "bosses_defeated >= 1"
  },
  "LEGENDARY_COMMANDER": {
    "name": "Legendary Commander",
    "description": "Reach level 100",
    "condition": "level >= 100"
  }
}
```

**Integration:**
- Game unlocks via `SteamUserStats.SetAchievement("ACH_NAME")`
- Also POST to our API for web profile display
- Sync achievement unlock dates

---

## 3. Data Flow Architecture

### Option A: Steam as Primary (Recommended)
```
Game Client
    ├─> Steam API (Primary)
    │   ├─ Leaderboards
    │   ├─ Stats
    │   └─ Achievements
    │
    └─> ETU API (Mirror)
        ├─ POST /api/stats/sync
        └─ Store in Supabase for web display
```

**Pros:**
- Steam handles all heavy lifting
- Built-in anti-cheat
- Automatic cloud save
- Works offline (syncs later)

**Cons:**
- Requires Steam SDK in game
- Non-Steam platforms need separate handling

### Option B: Dual Primary
```
Game Client
    ├─> Steam API (Steam users)
    └─> ETU API (All platforms)
        ├─ Supabase as source of truth
        └─ Periodic sync TO Steam
```

**Pros:**
- Works for all platforms (Steam, itch.io, web, etc.)
- More control over data
- Can implement custom anti-cheat

**Cons:**
- More complex sync logic
- Need to prevent duplication

---

## 4. Recommended Implementation Plan

### Phase 1: Foundation (Current)
- ✅ Supabase profiles table with stats columns
- ✅ Web profile page displays stats
- ✅ Steam OAuth login working
- ⚠️ Need: Run migration to add stats columns

### Phase 2: Game Integration
```rust
// In your Rust game client

// 1. Initialize Steam API
let steam_client = steamworks::Client::init()?;

// 2. On game event (kill, win, etc.)
fn on_enemy_killed() {
    // Update local counter
    player.total_kills += 1;

    // Update Steam stat
    steam_client.user_stats()
        .set_stat("total_kills", player.total_kills)?;

    // Send to ETU API
    send_stat_update("total_kills", player.total_kills);
}

// 3. On run complete
fn on_run_complete(score: i32, won: bool) {
    // Submit to Steam leaderboard
    upload_to_steam_leaderboard(score, "any_percent_run");

    // Submit to ETU API
    submit_score_to_etu(score, "Any% Run", "steam");

    // Update win/loss stats
    if won {
        update_stat("total_wins", player.total_wins + 1);
    } else {
        update_stat("total_losses", player.total_losses + 1);
    }
}
```

### Phase 3: Web Sync
Create endpoint to fetch Steam stats:
```typescript
// /api/steam/sync-stats
async function syncSteamStats(userId: string) {
  const profile = await getProfile(userId);

  if (profile.steam_id) {
    // Fetch from Steam API
    const steamStats = await fetch(
      `https://api.steampowered.com/ISteamUserStats/GetUserStatsForGame/v2/`,
      {
        params: {
          appid: YOUR_APP_ID,
          steamid: profile.steam_id
        }
      }
    );

    // Update Supabase
    await supabase
      .from('profiles')
      .update({
        total_kills: steamStats.total_kills,
        total_deaths: steamStats.total_deaths,
        highest_score: steamStats.highest_score,
        // ... etc
      })
      .eq('id', userId);
  }
}
```

---

## 5. Anti-Cheat Considerations

### Steam Built-in
- Stats stored server-side
- Leaderboard submissions validated
- VAC integration available

### Custom (For non-Steam)
```typescript
// Basic validation
function validateScore(score: number, playtime: number, kills: number) {
  // Check if score is physically possible
  const maxPossibleScore = kills * 1000 + playtime * 10;
  if (score > maxPossibleScore * 2) {
    return { valid: false, reason: 'Score too high for stats' };
  }

  // Check for duplicate submissions
  const recentScores = await getRecentScores(userId, '5m');
  if (recentScores.length > 10) {
    return { valid: false, reason: 'Too many submissions' };
  }

  return { valid: true };
}
```

---

## 6. Database Schema for Steam Integration

### Current Schema (profiles table)
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY,
  username TEXT,
  steam_id TEXT UNIQUE,
  avatar_url TEXT,
  faction_choice TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,

  -- Player Stats (NEW)
  level INTEGER DEFAULT 1,
  xp INTEGER DEFAULT 0,
  total_kills INTEGER DEFAULT 0,
  total_deaths INTEGER DEFAULT 0,
  total_wins INTEGER DEFAULT 0,
  total_losses INTEGER DEFAULT 0,
  total_playtime INTEGER DEFAULT 0,
  highest_score INTEGER DEFAULT 0,
  ship_class TEXT
);
```

### Additional Tables Needed

#### player_achievements
```sql
CREATE TABLE player_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  achievement_id TEXT NOT NULL,
  unlocked_at TIMESTAMP DEFAULT NOW(),
  platform TEXT DEFAULT 'web', -- 'web', 'steam', 'itch'
  UNIQUE(user_id, achievement_id)
);

CREATE INDEX idx_player_achievements_user ON player_achievements(user_id);
```

#### stat_history (optional - for charts/graphs)
```sql
CREATE TABLE stat_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  stat_name TEXT NOT NULL,
  value INTEGER NOT NULL,
  recorded_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_stat_history_user_date ON stat_history(user_id, recorded_at DESC);
```

---

## 7. API Endpoints Needed

### For Game Client
```
POST /api/stats/update
  - Update individual stats (kills, deaths, etc.)
  - Validate changes are reasonable

POST /api/scores/submit
  - Submit run score
  - Add to leaderboard
  - Update highest_score if applicable

POST /api/achievements/unlock
  - Unlock achievement
  - Store unlock timestamp

GET /api/profile/:userId/stats
  - Fetch current stats for display in-game
```

### For Web/Admin
```
GET /api/steam/sync/:userId
  - Manually trigger Steam stats sync

GET /api/leaderboard/steam/:mode
  - Fetch Steam leaderboard data

POST /api/admin/reset-stats/:userId
  - Reset player stats (admin only)
```

---

## 8. Implementation Checklist

### Database
- [ ] Run migration to add stats columns to profiles
- [ ] Create player_achievements table
- [ ] Create stat_history table (optional)
- [ ] Add indexes for performance

### Game Client
- [ ] Initialize Steam API on launch
- [ ] Track stats locally during gameplay
- [ ] Submit stats to Steam on events
- [ ] Submit scores to both Steam and ETU API
- [ ] Handle offline mode (queue for later sync)

### Backend
- [ ] Create /api/stats/update endpoint
- [ ] Create /api/scores/submit endpoint
- [ ] Create /api/achievements/unlock endpoint
- [ ] Create /api/steam/sync endpoint
- [ ] Implement validation and anti-cheat

### Web Profile
- [x] Display player stats on profile page
- [ ] Show achievement progress
- [ ] Add stat history charts (optional)
- [ ] Show Steam leaderboard rankings

---

## 9. Testing Strategy

### Local Testing
1. Use Steamworks SDK Sandbox mode
2. Test stat updates without real Steam account
3. Validate API endpoints with mock data

### Beta Testing
1. Set up Beta branch on Steam
2. Invite small group of testers
3. Monitor for stat anomalies
4. Test sync between Steam and web profile

### Production
1. Start with read-only Steam stats display
2. Gradually enable write operations
3. Monitor for cheating/exploits
4. Implement rate limiting

---

## 10. Cost Considerations

### Steam
- **Cost**: FREE - Steam provides all infrastructure
- **Limits**: None for stats/achievements
- **Bandwidth**: Covered by Steam

### Supabase (Current)
- **Free Tier**: 500MB database, 2GB bandwidth
- **Estimated Usage**:
  - ~100 bytes per profile
  - ~50 bytes per stat update
  - 10,000 users = ~1MB + stat updates
- **Recommendation**: Free tier sufficient for 10k users

### Scaling Costs
- 100k users: ~$25/month (Pro tier)
- 1M users: ~$599/month (Pro + addons)
- Consider caching frequent queries (Redis)

---

## 11. Recommended Next Steps

1. **Run Database Migration** (Immediate)
   ```bash
   cd /home/user/ETUWebsite
   npx supabase migration up
   ```

2. **Create Achievement System** (Week 1-2)
   - Define achievement list
   - Create achievements table
   - Add unlock endpoint
   - Display on profile page

3. **Game API Integration** (Week 2-4)
   - Implement stat tracking in Rust client
   - Create stat sync endpoints
   - Test with mock data

4. **Steam SDK Integration** (Week 4-6)
   - Initialize Steam client in game
   - Upload stats to Steam
   - Submit to Steam leaderboards
   - Sync achievements

5. **Web Sync** (Week 6-8)
   - Create Steam sync endpoint
   - Schedule periodic syncs
   - Add admin dashboard

---

## Summary

**Current Status**: ✅ Foundation in place
- Player profile page created
- Stats display implemented
- Database schema defined
- Steam authentication working

**Next Critical Step**: Run the migration to add stat columns to the profiles table

**Recommended Architecture**: Steam as primary for Steam users, with mirror to Supabase for cross-platform support and web display.

**Timeline to Full Integration**: 6-8 weeks for complete Steam + ETU API integration

**Cost**: FREE (Steam) + $0-25/month (Supabase, depending on scale)
