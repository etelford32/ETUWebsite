🌌 WordPress Theme Design Document – ETU Interactive Hub

1. Theme Overview
	•	Name: ETU Galaxy Portal
	•	Purpose: Provide a unified community hub for players and fans of Explore the Universe 2175 to:
	•	Create and manage accounts
	•	Share and discuss gameplay (forums, replays, tutorials)
	•	Show off achievements (leaderboards, custom ships, bosses)
	•	Contribute (feature requests, intergalactic radio/music submissions)
	•	Stay updated on game/world exploration
	•	Tone & Style: Futuristic, immersive, neon-lit UI (magenta, cyan, indigo) inspired by the ETU brand.

⸻

2. Core Components

2.1 Authentication & User Profiles
	•	Flows:
	•	Login, Sign-Up, Password Reset (via WP + Cognito/AWS or WP native + OAuth)
	•	Optional 2FA for security
	•	Profiles:
	•	Avatar (upload or select from ETU ships/creatures)
	•	Player stats: Achievements, Score, Rank, Ship(s), Bosses Created
	•	Activity feed: forum posts, replays, submissions

⸻

2.2 Forum System
	•	Base: bbPress or custom React-powered forum inside WordPress
	•	Features:
	•	Topics by category: Gameplay, Lore, Strategy, Feature Requests, Mods
	•	Nested replies, voting, tagging
	•	Integration with player profiles (show rank, badges, ship avatar next to posts)

⸻

2.3 Engagement Features
	1.	Scoreboards / Leaderboards
	•	Weekly, monthly, all-time rankings
	•	Sortable by: Kills, Exploration, Boss defeats, Achievements unlocked
	2.	Custom Ship Designs
	•	Upload ship concepts (image or JSON design spec from game files)
	•	Gallery with likes/upvotes
	•	“Featured Ship of the Week”
	3.	Custom Bosses
	•	Community submissions for boss ideas (stats, lore, sketches)
	•	Voting system → winners may get integrated into updates
	4.	Intergalactic Radio / Music Hub
	•	Music player for ETU soundtrack + community submissions
	•	DJ/live sets & featured tracks (link to The E.T. releases)
	•	Submit your own tracks → queue for approval
	5.	Game Replays & Tutorials
	•	Upload game replays (video or JSON logs → in-site viewer)
	•	Tutorials (official + community guides)
	•	“Learn the Game” section with structured onboarding
	6.	World Exploration
	•	Interactive 3D/2D map of discovered zones, planets, stations
	•	Player contributions: screenshots, lore notes, discoveries
	•	Dynamic: expands as players unlock zones
	7.	Feature Requests
	•	Dedicated forum board with voting
	•	Status tags: In Review, Planned, In Progress, Released

⸻

3. Theme Layout & Design

3.1 Pages & Navigation
	•	Home: Dynamic landing page with highlights (leaderboard snapshot, new music, featured forum threads, new ships)
	•	Forum: Full forum system
	•	Leaderboards: Player rankings with filters
	•	Explore: World/galaxy exploration hub
	•	Ships & Bosses: Community design galleries
	•	Radio: Music player hub
	•	Replays & Tutorials: Guides + uploads
	•	Feature Requests: Community voting & roadmap
	•	Profile: Personal dashboard
	•	Login / Sign-Up / Reset

3.2 Visual Design
	•	Dark background with neon accents
	•	Futuristic HUD-style UI (panels, grids, glowing borders)
	•	Fonts: Orbitron / Exo 2 for headers, Inter/Roboto for body
	•	Animations: Particle backgrounds, hover glows, loading warp effects

⸻

4. Gamification & Rewards
	•	XP System: Earn XP for posts, submissions, wins
	•	Badges: For milestones (e.g., “First Replay Uploaded”, “Top 100 Player”)
	•	Cosmetics: Profile banners, animated avatars
	•	Quests: Site-wide missions (“Post 10 times”, “Upload your ship”)

⸻

5. Technical Considerations
	•	Framework: WordPress theme (PHP + React components)
	•	Plugins/Integrations:
	•	bbPress / BuddyPress (forums + profiles)
	•	Gamipress or custom XP/leaderboard system
	•	WP-GraphQL + React for dynamic content
	•	AWS S3/CloudFront for media (ships, replays, music)
	•	Mailchimp/AWS SES for community emails
	•	Performance: Caching (Cloudflare/AWS), lazy load images, CDN for music/replays
	•	Mobile: Fully responsive, PWA option for app-like feel

⸻

6. Roadmap
	1.	Phase 1: Core Community
	•	Login/Profiles
	•	Forum
	•	Leaderboards
	2.	Phase 2: Creative Submissions
	•	Custom ships
	•	Boss submissions
	•	Music hub
	3.	Phase 3: Advanced Engagement
	•	Replays & Tutorials
	•	World exploration map
	•	Feature requests w/ voting
	4.	Phase 4: Gamification
	•	XP system, badges, quests
