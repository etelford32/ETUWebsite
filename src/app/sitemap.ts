import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/siteUrl'
import { getAllFactions } from '@/data/factions'
import { getAllBosses } from '@/data/bosses'
import { getAllZones } from '@/data/zones'

// Public marketing/content pages only. Deliberately excluded:
// - account/tester-flow pages (/profile, /dashboard, /feedback, /backlog,
//   /roadmap, /ship-designer, /alpha-testing, /admin) and the auth flow —
//   not indexable marketing content
// - /forum and /stats — currently hardcoded mockup data; add them back
//   once they serve real content
const STATIC_ROUTES = [
  '/',
  '/audio',
  '/bosses',
  '/careers',
  '/devlog',
  '/factions',
  '/faq',
  '/health-warning',
  '/investors',
  '/leaderboard',
  '/missile-game',
  '/press-kit',
  '/privacy',
  '/zones',
]

export default function sitemap(): MetadataRoute.Sitemap {
  const urls = [
    ...STATIC_ROUTES,
    // Only fully shipped profiles — "in-development" stubs render
    // near-identical placeholder copy and shouldn't be advertised for
    // indexing (they stay reachable via internal links).
    ...getAllFactions()
      .filter((f) => f.status === 'live')
      .map((f) => `/factions/${f.id}`),
    ...getAllBosses()
      .filter((b) => b.status === 'live')
      .map((b) => `/bosses/${b.id}`),
    ...getAllZones().map((z) => `/zones/${z.id}`),
  ]

  return urls.map((path) => ({ url: `${SITE_URL}${path}` }))
}
