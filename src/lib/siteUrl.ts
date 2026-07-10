/**
 * Canonical site origin (no trailing slash) — single source for
 * layout.tsx metadata, sitemap.ts, and robots.ts. If the primary domain
 * ever changes (e.g. www vs apex), change it here only.
 *
 * Note: transactional emails and auth redirects use
 * process.env.NEXT_PUBLIC_SITE_URL instead (see src/lib/lifecycleEmails.ts);
 * keep that env var on the same host as this constant.
 */
export const SITE_URL = 'https://www.exploretheuniverse2175.com'
