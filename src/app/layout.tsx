import type { Metadata } from 'next'
import Script from 'next/script'
import './globals.css'
import '../input.css'
import AnalyticsTracker from '@/components/AnalyticsTracker'
import { SITE_URL } from '@/lib/siteUrl'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: 'Explore the Universe 2175 — Roguelike Space RTS | Steam Playtest Open',
  description: 'A roguelike space RTS where 17 AI-driven factions wage real-time war. Physics-driven combat, permanent base loss, custom Rust engine. Playtest open on Steam.',
  alternates: {
    // Relative — resolves per page against metadataBase, so every route
    // self-canonicalizes instead of pointing at the homepage.
    canonical: './',
  },
  icons: {
    icon: '/logo2.png',
    apple: '/logo2.png',
  },
  manifest: '/manifest.json',
  openGraph: {
    title: 'Explore the Universe 2175 — Roguelike Space RTS | Steam Playtest Open',
    description: 'A roguelike space RTS where 17 AI-driven factions wage real-time war. Physics-driven combat, permanent base loss, custom Rust engine. Playtest open on Steam.',
    url: `${SITE_URL}/`,
    siteName: 'Explore the Universe 2175',
    images: [
      {
        url: `${SITE_URL}/etu_epic7.png`,
        width: 1024,
        height: 1024,
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Explore the Universe 2175 — Roguelike Space RTS | Steam Playtest Open',
    description: 'A roguelike space RTS where 17 AI-driven factions wage real-time war. Physics-driven combat, permanent base loss, custom Rust engine. Playtest open on Steam.',
    images: [`${SITE_URL}/etu_epic7.png`],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-deep-900 text-slate-100 selection:bg-indigo-500/40">
        {/* Google Analytics */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-6RCVW65DDL"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-6RCVW65DDL');
          `}
        </Script>
        <AnalyticsTracker />
        {children}
      </body>
    </html>
  )
}
