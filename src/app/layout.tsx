import type { Metadata } from 'next'
import Script from 'next/script'
import { Orbitron, Exo_2, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import '../input.css'
import AnalyticsTracker from '@/components/AnalyticsTracker'
import { FactionNavProvider, type FactionNavItem } from '@/components/FactionNavProvider'
import { getAllFactions } from '@/data/factions'
import { SITE_URL } from '@/lib/siteUrl'

// Self-hosted at build time: the CSP (next.config.js) only allows fonts and
// stylesheets from 'self', so a Google Fonts <link>/@import is blocked.
const orbitron = Orbitron({ subsets: ['latin'], display: 'swap', variable: '--font-orbitron-face' })
const exo2 = Exo_2({ subsets: ['latin'], display: 'swap', variable: '--font-exo2-face' })
// The mono face only appears in menus and data tables, never in a page's
// first screen, so it loads when first used instead of being preloaded.
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], display: 'swap', variable: '--font-jetbrains-face', preload: false })

// The header's faction menu, built here on the server so the header does not
// have to import the full faction profiles into every page's JavaScript.
// Live factions first, then the in-development roster, alphabetical within each.
const FACTION_NAV: FactionNavItem[] = getAllFactions()
  .map((f) => ({
    id: f.id,
    name: f.name,
    status: f.status ?? ('live' as const),
    color: f.color.primary,
  }))
  .sort(
    (a, b) =>
      Number(a.status !== 'live') - Number(b.status !== 'live') || a.name.localeCompare(b.name)
  )

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: 'Explore the Universe 2175 — Open-Galaxy Space Adventure | Free Steam Playtest',
  description: 'Explore a new galaxy every run: quests, bosses, black holes and solar storms, with a crystal AI companion who learns who you are. Free Steam playtest.',
  alternates: {
    // Relative — resolves per page against metadataBase, so every route
    // self-canonicalizes instead of pointing at the homepage.
    canonical: './',
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon-32.png', type: 'image/png', sizes: '32x32' },
      { url: '/icon-192.png', type: 'image/png', sizes: '192x192' },
    ],
    apple: { url: '/apple-touch-icon.png', sizes: '180x180' },
  },
  manifest: '/manifest.json',
  openGraph: {
    title: 'Explore the Universe 2175 — Open-Galaxy Space Adventure | Free Steam Playtest',
    description: 'Explore a new galaxy every run: quests, bosses, black holes and solar storms, with a crystal AI companion who learns who you are. Free Steam playtest.',
    url: `${SITE_URL}/`,
    siteName: 'Explore the Universe 2175',
    images: [
      {
        url: `${SITE_URL}/og/site.jpg`,
        width: 1200,
        height: 630,
        alt: 'A lone fighter flees the colossal MEGABOT in front of a burning star. Explore the Universe 2175.',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Explore the Universe 2175 — Open-Galaxy Space Adventure | Free Steam Playtest',
    description: 'Explore a new galaxy every run: quests, bosses, black holes and solar storms, with a crystal AI companion who learns who you are. Free Steam playtest.',
    images: [`${SITE_URL}/og/site.jpg`],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${orbitron.variable} ${exo2.variable} ${jetbrainsMono.variable}`}>
      <body className="bg-deep-900 text-slate-100 selection:bg-indigo-500/40">
        {/* Google Analytics */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-6RCVW65DDL"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            window.gtag = window.gtag || function gtag(){dataLayer.push(arguments);};
            gtag('js', new Date());
            var gaConfig = {};
            try {
              // ?debug_mode=1 sends this tab's hits to GA4 DebugView
              // (same flag as src/lib/gtag.ts; ?debug_mode=0 clears it).
              var f = new URLSearchParams(location.search).get('debug_mode');
              if (f === '1' || f === 'true') sessionStorage.setItem('ga_debug_mode', '1');
              else if (f === '0' || f === 'false') sessionStorage.removeItem('ga_debug_mode');
              if (sessionStorage.getItem('ga_debug_mode') === '1') gaConfig.debug_mode = true;
            } catch (e) {}
            gtag('config', 'G-6RCVW65DDL', gaConfig);
          `}
        </Script>
        <AnalyticsTracker />
        <FactionNavProvider factions={FACTION_NAV}>{children}</FactionNavProvider>
      </body>
    </html>
  )
}
