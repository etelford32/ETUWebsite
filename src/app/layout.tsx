import type { Metadata } from 'next'
import Script from 'next/script'
import './globals.css'
import '../input.css'
import AnalyticsTracker from '@/components/AnalyticsTracker'

export const metadata: Metadata = {
  metadataBase: new URL('https://www.exploretheuniverse2175.com'),
  title: 'Explore the Universe 2175 — Roguelike Space RTS | Steam Playtest Open',
  description: 'A roguelike space RTS where 17 AI-driven factions wage real-time war. Physics-driven combat, permanent base loss, custom Rust engine. Playtest open on Steam.',
  alternates: {
    canonical: 'https://www.exploretheuniverse2175.com/',
  },
  icons: {
    icon: '/logo2.png',
    apple: '/logo2.png',
  },
  manifest: '/manifest.json',
  openGraph: {
    title: 'Explore the Universe 2175 — Roguelike Space RTS | Steam Playtest Open',
    description: 'A roguelike space RTS where 17 AI-driven factions wage real-time war. Physics-driven combat, permanent base loss, custom Rust engine. Playtest open on Steam.',
    url: 'https://www.exploretheuniverse2175.com/',
    siteName: 'Explore the Universe 2175',
    images: [
      {
        url: 'https://www.exploretheuniverse2175.com/etu_epic7.png',
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
    images: ['https://www.exploretheuniverse2175.com/etu_epic7.png'],
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
