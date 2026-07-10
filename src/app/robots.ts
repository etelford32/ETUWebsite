import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/siteUrl'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: [
        '/',
        // Read-only content APIs that /devlog and /leaderboard fetch
        // client-side — Google's renderer must be able to reach them or
        // those pages index as empty shells.
        '/api/devlog',
        '/api/leaderboard',
      ],
      // Account/tester-flow pages and the auth flow — no crawl value.
      // '/profile$' ($ = exact match) keeps the private settings page out
      // while leaving the public share pages at /profile/<id> crawlable.
      disallow: [
        '/admin',
        '/api',
        '/dashboard',
        '/profile$',
        '/ship-designer',
        '/feedback',
        '/backlog',
        '/roadmap',
        '/alpha-testing',
        '/login',
        '/forgot-password',
        '/reset-password',
        '/invite',
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
