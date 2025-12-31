-- Seed data for player_scores table (TESTING ONLY)
-- This creates sample leaderboard entries for testing the leaderboard system

-- WARNING: This will create demo data. Only run in development/testing environments!

DO $$
DECLARE
  demo_user_id UUID;
  demo_modes TEXT[] := ARRAY['speedrun', 'survival', 'discovery', 'boss_rush'];
  demo_platforms TEXT[] := ARRAY['PC', 'Mac', 'Linux'];
  i INTEGER;
BEGIN
  -- Check if we already have scores
  IF EXISTS (SELECT 1 FROM player_scores LIMIT 1) THEN
    RAISE NOTICE 'Leaderboard already has data. Skipping seed.';
    RETURN;
  END IF;

  -- Get first profile ID (or create a demo one)
  SELECT id INTO demo_user_id FROM profiles LIMIT 1;

  IF demo_user_id IS NULL THEN
    RAISE NOTICE 'No profiles found. Creating demo profile first...';
    INSERT INTO profiles (id, username, avatar_url)
    VALUES (
      uuid_generate_v4(),
      'DemoCommander',
      'https://api.dicebear.com/8.x/avataaars/svg?seed=demo1'
    )
    RETURNING id INTO demo_user_id;
  END IF;

  -- Insert sample scores for testing
  FOR i IN 1..50 LOOP
    INSERT INTO player_scores (
      user_id,
      score,
      mode,
      platform,
      level,
      time_seconds,
      is_verified,
      submitted_at
    ) VALUES (
      demo_user_id,
      (1000000 - (i * 15000)) + floor(random() * 10000)::INTEGER, -- Descending scores with randomness
      demo_modes[1 + floor(random() * array_length(demo_modes, 1))::INTEGER],
      demo_platforms[1 + floor(random() * array_length(demo_platforms, 1))::INTEGER],
      floor(1 + random() * 50)::INTEGER, -- Random level 1-50
      floor(300 + random() * 3600)::INTEGER, -- Random time 5min-1hour
      true, -- Mark as verified for testing
      NOW() - (interval '1 day' * floor(random() * 30)::INTEGER) -- Random date within last 30 days
    );
  END LOOP;

  RAISE NOTICE 'Successfully seeded % leaderboard entries!', i;
  RAISE NOTICE 'Visit /leaderboard to see the test data';

END $$;

-- Verify the data was inserted
SELECT
  COUNT(*) as total_scores,
  COUNT(DISTINCT mode) as unique_modes,
  COUNT(DISTINCT platform) as unique_platforms,
  MIN(score) as min_score,
  MAX(score) as max_score
FROM player_scores;
