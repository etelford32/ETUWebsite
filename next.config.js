/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['api.dicebear.com', 'avatars.steamstatic.com'],
    formats: ['image/avif', 'image/webp'],
    // Art keeps its filename only while it is unchanged (replacements ship
    // under a new name), so resized copies can be kept for a month instead of
    // being re-encoded every minute.
    minimumCacheTTL: 2678400,
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  experimental: {
    optimizePackageImports: ['framer-motion'],
  },
  async redirects() {
    return [
      {
        // The old static Rise of the Machines campaign page now lives at /evil-robots.
        source: '/campaign/megabot',
        destination: '/evil-robots',
        permanent: false,
      },
      {
        // "Crystal Intelligences" is what the Lumari were, not a faction of
        // its own; the profile now lives under their name.
        source: '/factions/crystal-intelligences',
        destination: '/factions/lumari',
        permanent: false,
      },
    ]
  },
  async headers() {
    return [
      // Security headers for all routes
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()'
          },
          {
            key: 'Content-Security-Policy',
            // GA4 sends hits to regional hosts (region1.google-analytics.com,
            // *.analytics.google.com), not only www.google-analytics.com;
            // listing just the www hosts silently dropped most collection.
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://vercel.live https://*.googletagmanager.com https://*.google-analytics.com https://cdn.jsdelivr.net",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https: blob:",
              "font-src 'self' data:",
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.steampowered.com https://steamcommunity.com https://vercel.live https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com https://stats.g.doubleclick.net https://www.google.com",
              "media-src 'self' blob: https://*.supabase.co",
              "object-src 'none'",
              "frame-src 'self' https://steamcommunity.com https://vercel.live",
              "base-uri 'self'",
              "form-action 'self' https://steamcommunity.com",
              "frame-ancestors 'none'",
              "upgrade-insecure-requests"
            ].join('; ')
          }
        ],
      },
      // Cache headers for static assets
      {
        source: '/:all*(svg|jpg|png|webp|avif|mp4|gif|ico)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig
